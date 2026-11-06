import { centavos } from '@goose-money/core';
import { Eye, EyeOff, Info, Pencil, Plus, Trash2, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Toggle } from '@/components/ui/toggle';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { MoneyText } from '@/components/MoneyText';
import { estadosDoChip } from '@/components/estados';
import { StatusChip } from '@/components/StatusChip';

import { mensagens } from '../mensagens';
import { usePrivacidade } from '../providers/usePrivacidade';
import { SeletorDeTemaDev } from './SeletorDeTemaDev';

// Textos de exemplo, só para revisão visual em desenvolvimento.
function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-title-md">{titulo}</h2>
      <div className="flex flex-wrap items-start gap-3">{children}</div>
    </section>
  );
}

/** Componentes base e variantes, nos dois temas (só em desenvolvimento, `#/dev/componentes`). */
export function ComponentesDev() {
  const { oculto, alternar } = usePrivacidade();
  return (
    <main className="mx-auto flex max-w-conteudo flex-col gap-8 p-pagina">
      <h1 className="text-headline-md">Componentes</h1>
      <SeletorDeTemaDev />

      <Secao titulo="MoneyText">
        <Button
          variant="icon"
          aria-label={oculto ? mensagens.privacidade.mostrar : mensagens.privacidade.ocultar}
          aria-pressed={oculto}
          onClick={alternar}
        >
          {oculto ? <EyeOff /> : <Eye />}
        </Button>
        <MoneyText valor={centavos(650000)} tipo="receita" className="text-title-lg" />
        <MoneyText valor={centavos(8990)} tipo="despesa" className="text-title-lg" />
        <MoneyText valor={centavos(-150000)} tipo="neutro" className="text-title-lg" />
        <MoneyText valor={centavos(-8990)} className="text-headline-md" />
        <MoneyText valor={centavos(0)} />
      </Secao>

      <Secao titulo="StatusChip">
        {estadosDoChip.map((e) => (
          <StatusChip key={e} estado={e} />
        ))}
      </Secao>

      <Secao titulo="Button">
        <Button>Filled</Button>
        <Button variant="tonal">Tonal</Button>
        <Button variant="outlined">Outlined</Button>
        <Button variant="text">Text</Button>
        <Button variant="destructive">Apagar tudo</Button>
        <Button disabled>Desabilitado</Button>
        <Button>
          <Plus /> Com ícone
        </Button>
        <Button variant="icon" aria-label="Editar">
          <Pencil />
        </Button>
      </Secao>

      <Secao titulo="Input, Label, Textarea, Select">
        <div className="flex w-80 flex-col gap-1.5">
          <Label htmlFor="dev-email">E-mail</Label>
          <Input id="dev-email" type="email" placeholder="voce@exemplo.com" />
        </div>
        <div className="flex w-80 flex-col gap-1.5">
          <Label htmlFor="dev-senha" data-erro="true">
            Senha
          </Label>
          <Input id="dev-senha" type="password" aria-invalid aria-describedby="dev-erro" />
          <p id="dev-erro" role="alert" className="text-label-md text-error">
            E-mail ou senha inválidos
          </p>
        </div>
        <div className="flex w-80 flex-col gap-1.5">
          <Label htmlFor="dev-obs">Observações</Label>
          <Textarea id="dev-obs" />
        </div>
        <div className="flex w-80 flex-col gap-1.5">
          <Label htmlFor="dev-conta">Conta</Label>
          <Select>
            <SelectTrigger id="dev-conta">
              <SelectValue placeholder="Escolha a conta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="a">Conta corrente</SelectItem>
              <SelectItem value="b">Poupança</SelectItem>
              <SelectItem value="c" disabled>
                Arquivada
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Secao>

      <Secao titulo="Checkbox e Switch">
        <label className="flex min-h-alvo items-center gap-3 text-body-md">
          <Checkbox defaultChecked /> Manter conectado
        </label>
        <label className="flex min-h-alvo items-center gap-3 text-body-md">
          <Checkbox /> Desmarcado
        </label>
        <label className="flex min-h-alvo items-center gap-3 text-body-md">
          <Switch defaultChecked /> Parcelado
        </label>
        <label className="flex min-h-alvo items-center gap-3 text-body-md">
          <Switch /> Desligado
        </label>
      </Secao>

      <Secao titulo="Card">
        {(['elevated', 'outlined', 'filled'] as const).map((v) => (
          <Card key={v} variant={v} className="w-64">
            <CardHeader>
              <CardTitle>{v}</CardTitle>
              <CardDescription>Texto de apoio do card.</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </Secao>

      <Secao titulo="ToggleGroup (segmented) e Toggle (filter chip)">
        <ToggleGroup type="single" defaultValue="rd" aria-label="Visão">
          <ToggleGroupItem value="rd">Receitas e despesas</ToggleGroupItem>
          <ToggleGroupItem value="mv">Movimentações</ToggleGroupItem>
        </ToggleGroup>
        <Toggle defaultPressed>Este mês</Toggle>
        <Toggle>Últimos 3 meses</Toggle>
        <Toggle disabled>Desabilitado</Toggle>
      </Secao>

      <Secao titulo="Tabs">
        <Tabs defaultValue="visao" className="w-full">
          <TabsList aria-label="Painel">
            <TabsTrigger value="visao">Visão geral</TabsTrigger>
            <TabsTrigger value="saldos">Saldos</TabsTrigger>
            <TabsTrigger value="cartoes">Cartões</TabsTrigger>
          </TabsList>
          <TabsContent value="visao">Conteúdo da visão geral.</TabsContent>
          <TabsContent value="saldos">Conteúdo dos saldos.</TabsContent>
          <TabsContent value="cartoes">Conteúdo dos cartões.</TabsContent>
        </Tabs>
        <Tabs defaultValue="nov" className="w-full">
          <TabsList variant="secondary" aria-label="Faturas">
            {['out', 'nov', 'dez', 'jan', 'fev'].map((m) => (
              <TabsTrigger key={m} value={m}>
                <span>{m}</span>
                <span className="text-label-md font-normal">Aberta</span>
              </TabsTrigger>
            ))}
          </TabsList>
          {['out', 'nov', 'dez', 'jan', 'fev'].map((m) => (
            <TabsContent key={m} value={m}>
              Fatura de {m}.
            </TabsContent>
          ))}
        </Tabs>
      </Secao>

      <Secao titulo="Dialog, Drawer, Sheet, Popover">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outlined">Abrir dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo lançamento</DialogTitle>
              <DialogDescription>Dialog com raio de 28 dp.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="text">Cancelar</Button>
              <Button>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Drawer>
          <DrawerTrigger asChild>
            <Button variant="outlined">Abrir drawer em tela cheia</Button>
          </DrawerTrigger>
          <DrawerContent telaCheia>
            <DrawerHeader>
              <DrawerTitle>Novo lançamento</DrawerTitle>
              <DrawerDescription>Full-screen dialog do compact.</DrawerDescription>
            </DrawerHeader>
          </DrawerContent>
        </Drawer>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outlined">Abrir sheet</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Mais</SheetTitle>
              <SheetDescription>Painel lateral.</SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outlined">Abrir popover</Button>
          </PopoverTrigger>
          <PopoverContent>Conteúdo do popover.</PopoverContent>
        </Popover>
      </Secao>

      <Secao titulo="Tooltip e DropdownMenu">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="icon" aria-label="Como é calculado">
              <Info />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Soma dos saldos das contas que entram no total.</TooltipContent>
        </Tooltip>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outlined">Operações da compra</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>
              <Pencil /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem motivo="A primeira parcela já está numa fatura paga">
              Mudar o número de parcelas
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">
              <Trash2 /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Secao>

      <Secao titulo="Command">
        <Command className="w-96 rounded-md border border-outline-variant">
          <CommandInput placeholder="Buscar…" aria-label="Buscar" />
          <CommandList>
            <CommandEmpty>Nada encontrado.</CommandEmpty>
            <CommandGroup heading="Telas">
              <CommandItem>Painel</CommandItem>
              <CommandItem>Lançamentos</CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </Secao>

      <Secao titulo="Badge, Progress, Skeleton, Separator">
        <Badge>3</Badge>
        <Badge>12</Badge>
        <Badge variant="neutral">Novo</Badge>
        <div className="w-64">
          <Progress value={40} aria-label="Limite usado" />
        </div>
        <Skeleton className="h-10 w-40" />
        <Separator className="w-full" />
      </Secao>

      <Secao titulo="Alert (banner)">
        <Alert role="note">
          <Info />
          <AlertDescription>Nenhum mês fica abaixo do limite de alerta.</AlertDescription>
        </Alert>
        <Alert role="note" variant="warning">
          <TriangleAlert />
          <AlertDescription>O saldo projetado fica abaixo do limite em março.</AlertDescription>
          <AlertAction>
            <Button variant="text">Ver mês</Button>
          </AlertAction>
        </Alert>
        <Alert role="note" variant="error">
          <TriangleAlert />
          <AlertDescription>O saldo projetado fica negativo em abril.</AlertDescription>
        </Alert>
      </Secao>

      <Secao titulo="Table e ScrollArea">
        <ScrollArea className="h-48 w-full rounded-md border border-outline-variant">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Parcela</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {['Notebook', 'Geladeira', 'Celular', 'Sofá', 'Bicicleta'].map((d) => (
                <TableRow key={d}>
                  <TableCell>{d}</TableCell>
                  <TableCell className="text-right">3/10</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </Secao>

      <Secao titulo="Snackbar (Sonner)">
        <Button
          variant="outlined"
          onClick={() =>
            toast('Lançamento salvo', {
              action: {
                label: 'Desfazer',
                onClick: () => undefined,
              },
            })
          }
        >
          Mostrar snackbar
        </Button>
      </Secao>
    </main>
  );
}
