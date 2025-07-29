import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function RecentSales() {
  return (
    <div className="space-y-8">
      <div className="flex items-center">
        <Avatar className="h-9 w-9">
          <AvatarImage src="/placeholder.svg?height=36&width=36" alt="Avatar" />
          <AvatarFallback>CM</AvatarFallback>
        </Avatar>
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">Camisa Blanca Elegante</p>
          <p className="text-sm text-muted-foreground">Camisas - Talla M</p>
        </div>
        <div className="ml-auto font-medium">+2 unidades</div>
      </div>
      <div className="flex items-center">
        <Avatar className="flex h-9 w-9 items-center justify-center space-y-0 border">
          <AvatarImage src="/placeholder.svg?height=36&width=36" alt="Avatar" />
          <AvatarFallback>VF</AvatarFallback>
        </Avatar>
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">Vestido Floral Primavera</p>
          <p className="text-sm text-muted-foreground">Vestidos - Talla S</p>
        </div>
        <div className="ml-auto font-medium">+1 unidad</div>
      </div>
      <div className="flex items-center">
        <Avatar className="h-9 w-9">
          <AvatarImage src="/placeholder.svg?height=36&width=36" alt="Avatar" />
          <AvatarFallback>PV</AvatarFallback>
        </Avatar>
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">Pantalón Vaquero Clásico</p>
          <p className="text-sm text-muted-foreground">Pantalones - Talla 28</p>
        </div>
        <div className="ml-auto font-medium">+1 unidad</div>
      </div>
      <div className="flex items-center">
        <Avatar className="h-9 w-9">
          <AvatarImage src="/placeholder.svg?height=36&width=36" alt="Avatar" />
          <AvatarFallback>BL</AvatarFallback>
        </Avatar>
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">Blusa de Seda</p>
          <p className="text-sm text-muted-foreground">Blusas - Talla L</p>
        </div>
        <div className="ml-auto font-medium">+1 unidad</div>
      </div>
      <div className="flex items-center">
        <Avatar className="h-9 w-9">
          <AvatarImage src="/placeholder.svg?height=36&width=36" alt="Avatar" />
          <AvatarFallback>ZT</AvatarFallback>
        </Avatar>
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">Zapatos de Tacón</p>
          <p className="text-sm text-muted-foreground">Calzado - Talla 37</p>
        </div>
        <div className="ml-auto font-medium">+1 par</div>
      </div>
    </div>
  )
}
