// Na Vercel não existe o conceito de "bindings" injetados por request (como
// no Cloudflare Workers) — variáveis de ambiente são lidas direto de
// process.env (ver server/lib/env.ts). O contexto do Hono só carrega
// estado por requisição mesmo (Variables), como o admin autenticado.
export type HonoEnv = {
  Variables: {
    admin: { id: number; username: string };
  };
};
