## The Task

We want to build a small pipeline that:

1. Takes a user's topic as input (e.g. `"bears"`)
2. Formats it into a prompt
3. Sends it to an LLM
4. Returns a clean string back to the user

That's it. One input, one output, three logical steps. Now let's see how each approach handles this.

---

## Approach 1: LCEL Pipe (`|`)

### The Principle

LCEL is built on a single abstraction: **Runnable**. Every component in LangChain — prompt templates, LLMs, output parsers, retrievers, custom functions — implements the same interface with `.invoke()`, `.stream()`, `.batch()`, and `.ainvoke()` methods. Because they all speak the same language, you can snap them together with the `|` operator, which is Python's bitwise OR redefined via `__or__` on Runnable classes.

When you write `prompt | model | parser`, Python evaluates left-to-right:

1. `prompt.__or__(model)` returns a `RunnableSequence` of two steps.
2. That sequence's `.__or__(parser)` returns a `RunnableSequence` of three steps.

The result is a **lazy blueprint** — nothing executes until you call `.invoke()`, `.stream()`, or `.batch()`. At that point, data flows through each step sequentially: the dict goes into the prompt, the formatted message goes into the model, the `AIMessage` goes into the parser, and the final string is returned.

The key insight is **composition over configuration**. You're not telling an object "here's your prompt, here's your LLM, here's your parser." You're declaring a data flow, and the framework handles the plumbing. This is the same mental model as Unix pipes: `cat file | grep x | wc -l`.

### The Code

```python
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

# Each of these is a Runnable
prompt = ChatPromptTemplate.from_template("Tell me a joke about {topic}")
model = ChatOpenAI(model="gpt-4o-mini")
parser = StrOutputParser()

# Compose them — this is lazy, nothing runs yet
chain = prompt | model | parser

# Now execute
result = chain.invoke({"topic": "bears"})
print(result)
# "Why don't bears wear shoes? Because they'd have to be paws-itive..."
```

### What's happening under the hood

- `chain` is a `RunnableSequence` object.
- `.invoke({"topic": "bears"})` passes the dict to `prompt`, which formats it into a `PromptValue`.
- The `PromptValue` is passed to `model`, which returns an `AIMessage`.
- The `AIMessage` is passed to `parser`, which extracts `.content` and returns a plain `str`.
- You get the final string.

### Bonus capabilities you get for free

```python
# Streaming — token by token
for chunk in chain.stream({"topic": "cats"}):
    print(chunk, end="", flush=True)

# Batching — parallel execution
results = chain.batch([{"topic": "dogs"}, {"topic": "birds"}])

# Async
import asyncio
result = asyncio.run(chain.ainvoke({"topic": "fish"}))
```

These work on **any** composed chain without changing a single line of the pipeline definition.

---

## Approach 2: Direct `.invoke()`

### The Principle

This is the most basic unit of work in LangChain: **one Runnable, one call**. You prepare your input (a list of `BaseMessage` objects), pass it to a single component's `.invoke()`, and get back its output. There's no composition, no pipeline, no intermediate steps.

The principle here is **imperative, step-by-step control**. You explicitly build the messages, explicitly call the model, and explicitly handle the response. You're the one managing data flow between steps (if there are steps). This is the pattern you use when:

- You're inside a **LangGraph node** and the graph already assembled your messages for you.
- You need the **full `AIMessage`** (with `.tool_calls`, `.usage_metadata`, etc.) and don't want a parser to strip it.
- You have **one step** and adding a pipeline would be over-engineering.

### The Code

```python
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

model = ChatOpenAI(model="gpt-4o-mini")

# You build the messages yourself
messages = [
    SystemMessage(content="You are a comedian. Keep jokes short."),
    HumanMessage(content="Tell me a joke about bears")
]

# One call, one result
response = model.invoke(messages)

# response is an AIMessage — you access .content for the string
print(response.content)
# "Why don't bears wear shoes? Because they'd have to be paws-itive..."
```

### What's happening under the hood

- You manually construct the message list (system + user).
- `model.invoke(messages)` sends the full conversation to the API.
- You get back an `AIMessage` object with `.content`, `.tool_calls`, `.usage_metadata`, etc.
- You extract what you need (`.content` for a string).

### What you lose compared to the pipe

- **No free streaming/batching on a composed pipeline.** You can still call `model.stream(messages)`, but if you later add a retrieval step, you'll need to manually wire the intermediate results.
- **No composability.** You can't pass `model` into a larger chain with `|`. Well, you actually can (it's a Runnable), but the point is you're not _using_ the composition feature.
- **No declarative data flow.** The reader has to trace your code to understand what happens where.

---

## When to Use Which — The Decision Logic

**Start with direct `.invoke()`** when:

- You're writing a **LangGraph node**. The graph's state already contains the full `messages` list. Your node's job is "call the model, return the response." That's one step. The pipe adds nothing.

```python
# LangGraph node — the graph handles message assembly
def call_model(state: State, config: Configuration) -> AIMessage:
    return get_model(config).invoke(state["messages"])
```

- You need the **raw `AIMessage`** to inspect `.tool_calls` for routing logic. A `StrOutputParser` would destroy that information.

**Reach for the pipe** when:

- You have **2+ transformations** between input and final output. The moment you write `x = step1(y); z = step2(x); return step3(z)`, replace it with `step1 | step2 | step3`.

- You want a **reusable, named pipeline** you can pass around, compose into a larger chain, or swap components in.

- You need **streaming or batching** on a multi-step pipeline without writing glue code.

```python
# RAG pipeline — pipe earns its keep
from langchain_core.runnables import RunnablePassthrough

def format_docs(docs):
    return "\n\n".join(d.page_content for d in docs)

rag_chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | ChatPromptTemplate.from_template(
        "Answer using context:\n{context}\n\nQ: {question}"
    )
    | model
    | StrOutputParser()
)

answer = rag_chain.invoke("What is machine learning?")
```

Trying to write that RAG flow with sequential `.invoke()` calls would mean manually extracting the retriever's output, formatting it, building the prompt, calling the model, and parsing the result — five lines of glue code that `|` eliminates in one expression.

---

## The Mental Model

Think of it this way:

- **Direct `.invoke()`** is a function call. You have a tool, you use it, you get a result. Simple, explicit, no magic.

- **LCEL pipe** is a factory line. You define the stations in order, and the product flows through them. You can add a station, remove one, or run the line in parallel — without changing how any individual station works.

The pipe doesn't replace `.invoke()` — it _wraps_ it. Under the hood, `chain.invoke(input)` calls `.invoke()` on each step in sequence. The pipe is the **orchestration layer** on top of the same primitive calls.
