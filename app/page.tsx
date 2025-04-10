import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import DatabasePanel from "@/components/database-panel"
import BackupPanel from "@/components/backup-panel"
import ImportExportPanel from "@/components/import-export-panel"
import SecurityPanel from "@/components/security-panel"
import DockerSetup from "@/components/docker-setup"

export default function Home() {
  return (
    <main className="container mx-auto py-6 px-4">
      <h1 className="text-3xl font-bold mb-6">Administración de MongoDB</h1>

      <Tabs defaultValue="docker" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="docker">Docker</TabsTrigger>
          <TabsTrigger value="databases">Bases de Datos</TabsTrigger>
          <TabsTrigger value="backup">Respaldos</TabsTrigger>
          <TabsTrigger value="import">Importar/Exportar</TabsTrigger>
          <TabsTrigger value="security">Seguridad</TabsTrigger>
        </TabsList>

        <TabsContent value="docker" className="p-4 border rounded-md mt-2">
          <DockerSetup />
        </TabsContent>

        <TabsContent value="databases" className="p-4 border rounded-md mt-2">
          <DatabasePanel />
        </TabsContent>

        <TabsContent value="backup" className="p-4 border rounded-md mt-2">
          <BackupPanel />
        </TabsContent>

        <TabsContent value="import" className="p-4 border rounded-md mt-2">
          <ImportExportPanel />
        </TabsContent>

        <TabsContent value="security" className="p-4 border rounded-md mt-2">
          <SecurityPanel />
        </TabsContent>
      </Tabs>
    </main>
  )
}

///ya funciona no mover nada todo esta funcionando aqui. 