# LangGraph Concepts and Graph Assembly in main.py

This guide explains the flow, state management, and assembly logic used in [main.py](file:///home/miguelsb/workspace/open-politics/main.py). 

---

## 1. What is `MessagesState`?

In LangGraph, the **State** is the shared memory of the entire graph. Every node reads from this state and returns updates to it.

`MessagesState` is a built-in state defined in LangGraph as:
```python
from typing import Annotated, TypedDict
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages

class MessagesState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
```

### Key Concepts:
1. **The `add_messages` Reducer**: 
   When a node returns a dictionary like `{"messages": [new_message]}`, LangGraph does **not** overwrite the existing list. Because of the `add_messages` annotation, it **appends** (or updates, if the message IDs match) the new messages to the existing list.
2. **Conversation History**:
   Because of this appending behavior, `state["messages"]` acts as a chronological list of all messages exchanged so far.

### Why do we index with `[0]` and `[-1]`?
As the graph runs, messages are added in order:
1. **User asks question**: `state["messages"]` contains: `[HumanMessage(content="What does...")]`
   * `state["messages"][0]` is the user's initial query.
2. **LLM processes query**: `state["messages"]` becomes: `[HumanMessage(...), AIMessage(tool_calls=[...])]`
3. **Tool runs**: `state["messages"]` becomes: `[HumanMessage(...), AIMessage(...), ToolMessage(content="retrieved content...")]`
   * `state["messages"][-1]` is the **most recent** message. In `generate_answer`, `state["messages"][-1]` is the `ToolMessage` containing the context documents, which we use to feed the LLM prompt.

---

## 2. Graph Assembly (Nodes vs. Edges)

The graph is assembled starting at line 287 of `main.py`:

```python
workflow = StateGraph(MessagesState)

# 1. Add the nodes (the steps)
workflow.add_node(generate_query_or_respond)
workflow.add_node("retrieve", ToolNode([retrieve_blog_posts]))
workflow.add_node(rewrite_question)
workflow.add_node(generate_answer)

# 2. Add the entry point
workflow.add_edge(START, "generate_query_or_respond")
```

* **Nodes**: Python functions that receive the current state and return state updates.
* **Edges**: Control flow connections between nodes.
  * **Normal Edges (`add_edge`)**: Connect Node A to Node B unconditionally.
  * **Conditional Edges (`add_conditional_edges`)**: Route to a node based on the output of a decision function.

---

## 3. Conditional Routing Logic

There are two conditional edges in the graph, showcasing the two different ways to use conditional routing.

### Case A: Routing with a Mapping Dictionary
Used after `generate_query_or_respond` to decide whether to call a tool or finish:

```python
def route_on_tool_calls(state: MessagesState):
    last_msg = state["messages"][-1]
    if getattr(last_msg, "tool_calls", None):
        return "tools"
    return END

workflow.add_conditional_edges(
    "generate_query_or_respond",
    route_on_tool_calls,
    { 
        "tools": "retrieve",
        END: END,
    }
)
```

* **How it works**:
  1. `generate_query_or_respond` finishes execution.
  2. LangGraph calls `route_on_tool_calls(state)`.
  3. `route_on_tool_calls` looks at the last message. If the LLM wanted to call a tool, it returns the string `"tools"`. Otherwise, it returns `END`.
  4. LangGraph uses the **mapping dictionary** `{ "tools": "retrieve", END: END }` to resolve the returned string to the next node name. If `"tools"` is returned, it executes the `"retrieve"` node. If `END` is returned, the graph stops.

---

### Case B: Direct Routing (No Mapping Dictionary)
Used after the retrieval node to decide if the retrieved documents are relevant:

```python
def grade_documents(state: MessagesState) -> Literal["generate_answer", "rewrite_question"]:
    # ... grading logic ...
    if response.binary_score == "yes":
        return "generate_answer"
    return "rewrite_question"

workflow.add_conditional_edges(
    "retrieve",
    grade_documents
)
```

* **How it works**:
  * Since no mapping dictionary is provided to `add_conditional_edges`, LangGraph assumes that the string returned by the routing function (`"generate_answer"` or `"rewrite_question"`) is the **exact name of the destination node** to execute next.

---

## 4. Function Signatures & Return Types

Here is a summary of the arguments and return types for each node/routing function:

| Function Name | Input Arguments | Return Type | Purpose / Action |
| :--- | :--- | :--- | :--- |
| `generate_query_or_respond` | `state: MessagesState` | `dict` (e.g., `{"messages": [AIMessage]}`) | Asks the LLM to decide whether it needs a tool (`retrieve_blog_posts`) or can answer directly. |
| `route_on_tool_calls` (Router) | `state: MessagesState` | `str` (returns `"tools"` or `END`) | Inspects the last message to see if tool calls exist, routing to `"retrieve"` or finishing. |
| `retrieve` (`ToolNode`) | `state: MessagesState` | `dict` (e.g., `{"messages": [ToolMessage]}`) | Invokes the actual `retrieve_blog_posts` tool and appends the result to the messages list. |
| `grade_documents` (Router) | `state: MessagesState` | `str` (returns `"generate_answer"` or `"rewrite_question"`) | Evaluates if the retrieved tool results are relevant to the original user query. |
| `rewrite_question` | `state: MessagesState` | `dict` (e.g., `{"messages": [HumanMessage]}`) | Rewrites the query to improve semantic search search query quality. |
| `generate_answer` | `state: MessagesState` | `dict` (e.g., `{"messages": [AIMessage]}`) | Instructs the LLM to answer the user query based *only* on the retrieved context document. |

---

## 5. Implementing a Custom Shared State

If you want to track information outside of the raw conversation history (for example, keeping count of rewrites, tracking the raw rewritten query, or saving grading scores), you can define a custom state.

### Step 1: Define Your Custom State
Instead of importing `MessagesState`, create your own `TypedDict`:

```python
from typing import Annotated, TypedDict
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages

class CustomState(TypedDict):
    # Keep the message history
    messages: Annotated[list[BaseMessage], add_messages]
    # Add custom variables
    rewrite_count: int
    is_relevant: bool
    rewritten_query: str
```

### Step 2: Use the Custom State in Graph Initialization
```python
# Pass CustomState to the StateGraph constructor
workflow = StateGraph(CustomState)
```

### Step 3: Update Nodes to Receive and Modify the Custom State
When defining your nodes, they will now receive `CustomState` and can return updates for the new variables:

```python
def rewrite_question(state: CustomState):
    question = state["messages"][0].content
    
    # 1. Read current count and increment it
    current_count = state.get("rewrite_count", 0) + 1
    
    # 2. Logic to rewrite question
    prompt = REWRITE_PROMPT.format(question=question)
    response = response_model.invoke([{"role": "user", "content": prompt}])
    
    # 3. Return updates to both messages and your custom state variables
    return {
        "messages": [HumanMessage(content=response.content)],
        "rewrite_count": current_count,
        "rewritten_query": response.content
    }
```
