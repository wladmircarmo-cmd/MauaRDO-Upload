# Configuração do Supabase Storage para Upload Anônimo

## Passo 1: Criar o Bucket "fotos-planilhas"

1. Acesse o painel do Supabase → Storage → Buckets
2. Clique em "Create a new bucket"
3. Nome: `fotos-planilhas`
4. Deixe a opção "Make it public" **desativada** (vamos controlar via RLS)
5. Clique em "Create bucket"

## Passo 2: Configurar Políticas RLS (Row Level Security)

### No Supabase, vá para: Storage → Buckets → fotos-planilhas → Policies

#### Política 1: Permitir INSERT para qualquer um (upload anônimo)

```sql
CREATE POLICY "Allow INSERT for all" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'fotos-planilhas')
```

- Ou pela UI do Supabase:
  - Click em "New policy"
  - Template: "Allow insert"
  - Click "Review"
  - Click "Save policy"

#### Política 2: Permitir SELECT para qualquer um (ler os arquivos)

```sql
CREATE POLICY "Allow SELECT for all" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'fotos-planilhas')
```

- Pela UI: Template "Allow select", salvar.

## Passo 3: Validar a Configuração

- O bucket deve aparecer em Storage → Buckets com o nome `fotos-planilhas`
- As duas políticas devem estar visíveis em Policies

## Se ainda der erro 500:

1. Verifique se `SUPABASE_SERVICE_ROLE_KEY` está correto em `.env.local`
2. Teste a conexão com um comando simples:
   ```bash
   npm run dev
   # acesse http://localhost:3000 e tente fazer upload
   # veja os logs no terminal para mensagens de erro detalhadas
   ```
3. Procure por erros como "Bucket not found" ou "Permission denied"
