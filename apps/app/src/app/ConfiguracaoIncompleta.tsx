export function ConfiguracaoIncompleta({ variaveis }: { variaveis: string[] }) {
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-xl font-medium">Configuração incompleta</h1>
      <p className="mt-2">Preencha no arquivo .env e reinicie o app:</p>
      <ul className="mt-2 list-disc pl-6">
        {variaveis.map((v) => (
          <li key={v}>
            <code>{v}</code>
          </li>
        ))}
      </ul>
    </main>
  );
}
