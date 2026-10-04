adicionar animações com react motion ao logo de todo app para deixalo mais vivo

aq estao algumas, em lugares aonde for detectado o filme, podemos utrilizar o tooltip e associar mais informacoes ao filme,
adicionamos uma instrução especial nos prompts para buscar o id do filme e ai conseguimos mostrar informacoes como uma preview ao passar o mouse por cima do filme, e sla, definimos um padrao como

(Movie Name)[movie-id] e ai caso consigamos detectar este padrao no nosso markdown renderer nos buscanos em um endpoint do backend especializado para isto
que vai retornar informacoes tp sinpose, url do poster, enfim, e vamos utilizar o tooltip do aceternity ui

https://ui.aceternity.com/components/tooltip-card

alem disso explorar outros locais que possam ser uteis de adicionar este tooltip

alem de outras animações como o dialog surgindo e saindo

expandir locais como os blocks no @NodeStepper

Adicionar tp aquele efeito glow  no centro da pagina inicial, 

adicionar efeitos tp de swipe, na tela do provedor quando eu clico em um, ele parece q se move da esquerda pra direita, ou entao debaixo pra cima, @ProviderForm.tsx, mesma coisa em @SuggestionsExplorer

adicionar uma opcao de copiar o grafico como imagem ou entao baixar como png, e alem disso, no final da conversa em @ChatMessageActions
ao copiar a conversa, se tiver um grafico ali no meio vamos transformar em um data uri e coocar isso na parte copiada pelo usuário

trocar o alerta ao sair da pagina no meio de uma sessão pelo nativo do shacdn 

https://ui.shadcn.com/docs/components/base/alert-dialog

adicionar skelletons loaders

adicionar a renderização ao vivo ao inves de ser de uma vez, q eh oq esta acontecendo atualmente, precisamos analisar se seria viavel, como seria e tal ja q os dados sao meio q json ne, e nao so mensagems


criar um readme bem lean sobre o projeto, colocar a maquina de estdo presente em ai-implementation, colcoar varios prints, colocar tb as perguntas e oq eh esperado em cada uma, bem como as capacidades do sistema

