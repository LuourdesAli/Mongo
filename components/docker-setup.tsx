import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function DockerSetup() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuración de MongoDB en Docker</CardTitle>
          <CardDescription>Sigue estos pasos para configurar MongoDB en un contenedor Docker</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <h3 className="text-lg font-medium">1. Crear un archivo docker-compose.yml</h3>
          <div className="bg-muted p-4 rounded-md">
            <pre className="text-sm">
              {`version: '3.8'
services:
  mongodb:
    image: mongo:latest
    container_name: mongodb
    restart: always
    ports:
      - 27017:27017
    environment:
      MONGO_INITDB_ROOT_USERNAME: Lulu
      MONGO_INITDB_ROOT_PASSWORD: Lourdes1102
    volumes:
      - mongodb_data:/data/db

volumes:
  mongodb_data:`}
            </pre>
          </div>

          <h3 className="text-lg font-medium">2. Iniciar el contenedor</h3>
          <div className="bg-muted p-4 rounded-md">
            <pre className="text-sm">{`docker-compose up -d`}</pre>
          </div>

          <h3 className="text-lg font-medium">3. Verificar que el contenedor está en ejecución</h3>
          <div className="bg-muted p-4 rounded-md">
            <pre className="text-sm">{`docker ps`}</pre>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Importante</AlertTitle>
            <AlertDescription>
              Asegúrate de tener Docker y Docker Compose instalados en tu sistema antes de ejecutar estos comandos.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Conexión a MongoDB</CardTitle>
          <CardDescription>Información para conectarse al servidor MongoDB</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Host:</p>
              <p className="text-sm">localhost</p>
            </div>
            <div>
              <p className="text-sm font-medium">Puerto:</p>
              <p className="text-sm">27017</p>
            </div>
            <div>
              <p className="text-sm font-medium">Usuario:</p>
              <p className="text-sm">Lulu</p>
            </div>
            <div>
              <p className="text-sm font-medium">Contraseña:</p>
              <p className="text-sm">Lourdes1102</p>
            </div>
          </div>

          <h3 className="text-lg font-medium">Conexión desde la línea de comandos</h3>
          <div className="bg-muted p-4 rounded-md">
            <pre className="text-sm">{`docker exec -it mongodb mongosh -u Lulu -p Lourdes1102`}</pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

///ya funciona no mover nada todo esta funcionando aqui. 