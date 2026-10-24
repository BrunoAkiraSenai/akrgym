# Laboratório de telas

Roda o app real com o Firebase trocado por dados de exemplo (`mock.js`): 45 dias de dieta, 3 meses de treino 3x por semana, medidas e amigos. Nada sai do navegador e o banco de produção não é tocado. Serve para ver e comparar telas sem login.

## Subir

```bash
npm run lab
```

Abre em `http://127.0.0.1:5187/?scene=normal`. Para rodar outra cópia do app (por exemplo, uma pasta com a versão de `PRD`), passe o caminho e, para rodar junto com a principal, uma porta: `node tools/lab/server.mjs C:\caminho\da\copia 5188`. A cópia precisa de `node_modules` (uma junção para o do repositório basta).

## Parâmetros da URL

- `scene`: `normal` (dados de exemplo), `vazio` (conta nova sem plano), `login` (sem sessão), `slow` (tudo 40x mais lento).
- `tema`: `roxo-suave`, `esmeralda`, `oceano`, `lava` (Claro) ou `original` (Escuro).
- `passos`: botões a tocar depois de carregar, separados por `|`, pelo começo do texto. Ex.: `passos=Dieta|Estat` abre Dieta → Estatísticas. Use só o começo sem acento (`Evolu`, `Estat`), porque o PowerShell altera acentos na linha de comando.
- `/moldura?w=390&h=844&...`: o app dentro de uma moldura com largura exata (o Chrome invisível não aceita janela estreita).

## Capturas em lote (Windows)

Cada linha de uma lista: `nome;largura;altura;query`, com um quinto campo opcional para o tempo virtual em ms (padrão 12000). Espaço na query vira `%20`.

```bash
powershell -File tools/lab/shots.ps1 -Lista lista.txt -Saida capturas -Porta 5187
```

Usa o Chrome instalado em modo invisível. Animações não rodam nesse modo, então confira movimento num navegador visível.
