"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, Upload, FileJson, FileSpreadsheetIcon as FileCsv, Database, FolderOpen, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Textarea } from "@/components/ui/textarea"

interface DatabaseInfo {
  name: string
  sizeOnDisk: number
  empty: boolean
}

interface CollectionInfo {
  name: string
  count: number
  size: number
}

export default function ImportExportPanel() {
  const { toast } = useToast()

  const [databases, setDatabases] = useState<DatabaseInfo[]>([])
  const [collections, setCollections] = useState<CollectionInfo[]>([])

  const [selectedDb, setSelectedDb] = useState("")
  const [selectedCollection, setSelectedCollection] = useState("")
  const [format, setFormat] = useState("json")
  const [query, setQuery] = useState("{}")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dropCollection, setDropCollection] = useState(false)

  const [isLoadingDbs, setIsLoadingDbs] = useState(false)
  const [isLoadingCollections, setIsLoadingCollections] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  // Cargar bases de datos al iniciar
  useEffect(() => {
    fetchDatabases()
  }, [])

  // Cargar colecciones cuando se selecciona una base de datos
  useEffect(() => {
    if (selectedDb) {
      fetchCollections(selectedDb)
    } else {
      setCollections([])
      setSelectedCollection("")
    }
  }, [selectedDb])

  // Obtener bases de datos
  const fetchDatabases = async () => {
    setIsLoadingDbs(true)
    try {
      const response = await fetch("/api/mongodb/databases")
      const data = await response.json()

      if (data.success) {
        setDatabases(data.databases.filter((db: DatabaseInfo) => !["admin", "local", "config"].includes(db.name)))
      } else {
        toast({
          title: "Error",
          description: data.error || "No se pudieron cargar las bases de datos",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error de conexión al servidor",
        variant: "destructive",
      })
    } finally {
      setIsLoadingDbs(false)
    }
  }

  // Obtener colecciones
  const fetchCollections = async (dbName: string) => {
    setIsLoadingCollections(true)
    try {
      const response = await fetch(`/api/mongodb/collections?db=${dbName}`)
      const data = await response.json()

      if (data.success) {
        setCollections(data.collections)
      } else {
        toast({
          title: "Error",
          description: data.error || "No se pudieron cargar las colecciones",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error de conexión al servidor",
        variant: "destructive",
      })
    } finally {
      setIsLoadingCollections(false)
    }
  }

  // Exportar datos
  const exportData = async () => {
    if (!selectedDb || !selectedCollection) return

    try {
      // Validar JSON de la consulta
      JSON.parse(query)

      setIsExporting(true)

      // Crear URL para la descarga
      const queryParam = encodeURIComponent(query)
      const url = `/api/mongodb/import-export/export?db=${selectedDb}&collection=${selectedCollection}&format=${format}&query=${queryParam}`

      // Abrir en nueva pestaña para descargar
      window.open(url, "_blank")
    } catch (error: any) {
      toast({
        title: "Error",
        description: "La consulta no es un JSON válido",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  // Importar datos
  const importData = async () => {
    if (!selectedDb || !selectedCollection || !selectedFile) return

    setIsImporting(true)
    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("db", selectedDb)
      formData.append("collection", selectedCollection)
      formData.append("drop", dropCollection.toString())

      const response = await fetch("/api/mongodb/import-export/import", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Éxito",
          description: `Datos importados correctamente a ${selectedDb}.${selectedCollection}`,
        })
        setSelectedFile(null)
        // Recargar colecciones para ver los cambios
        fetchCollections(selectedDb)
      } else {
        toast({
          title: "Error",
          description: data.error || "No se pudieron importar los datos",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error de conexión al servidor",
        variant: "destructive",
      })
    } finally {
      setIsImporting(false)
    }
  }

  // Manejar cambio de archivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0])
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Importación y Exportación</h2>
      </div>

      <Tabs defaultValue="export" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="export">Exportar Datos</TabsTrigger>
          <TabsTrigger value="import">Importar Datos</TabsTrigger>
        </TabsList>

        <TabsContent value="export" className="space-y-4 p-4 border rounded-md mt-2">
          <Card>
            <CardHeader>
              <CardTitle>Exportar Datos</CardTitle>
              <CardDescription>Exporta datos de una colección en formato JSON o CSV</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="export-db">Base de Datos</Label>
                  {isLoadingDbs ? (
                    <div className="flex justify-center py-2">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  ) : (
                    <Select onValueChange={setSelectedDb} value={selectedDb}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una base de datos" />
                      </SelectTrigger>
                      <SelectContent>
                        {databases.map((db) => (
                          <SelectItem key={db.name} value={db.name}>
                            <div className="flex items-center">
                              <Database className="mr-2 h-4 w-4" />
                              {db.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="export-collection">Colección</Label>
                  {isLoadingCollections ? (
                    <div className="flex justify-center py-2">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  ) : (
                    <Select onValueChange={setSelectedCollection} value={selectedCollection} disabled={!selectedDb}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una colección" />
                      </SelectTrigger>
                      <SelectContent>
                        {collections.map((collection) => (
                          <SelectItem key={collection.name} value={collection.name}>
                            <div className="flex items-center">
                              <FolderOpen className="mr-2 h-4 w-4" />
                              {collection.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Formato</Label>
                <div className="flex space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="format-json"
                      name="format"
                      value="json"
                      checked={format === "json"}
                      onChange={() => setFormat("json")}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="format-json" className="flex items-center">
                      <FileJson className="mr-2 h-4 w-4" />
                      JSON
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="format-csv"
                      name="format"
                      value="csv"
                      checked={format === "csv"}
                      onChange={() => setFormat("csv")}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="format-csv" className="flex items-center">
                      <FileCsv className="mr-2 h-4 w-4" />
                      CSV
                    </Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="query">Consulta (opcional)</Label>
                <Textarea
                  id="query"
                  placeholder='{ "status": "active" }'
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  disabled={!selectedCollection}
                  className="font-mono"
                />
                <p className="text-sm text-muted-foreground">
                  Filtro en formato JSON para exportar solo documentos específicos
                </p>
              </div>

              <div className="flex justify-end">
                <Button disabled={!selectedCollection || isExporting} onClick={exportData}>
                  {isExporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Download className="mr-2 h-4 w-4" />
                  Exportar {format.toUpperCase()}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="space-y-4 p-4 border rounded-md mt-2">
          <Card>
            <CardHeader>
              <CardTitle>Importar Datos</CardTitle>
              <CardDescription>Importa datos desde un archivo JSON o CSV</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="import-db">Base de Datos</Label>
                  {isLoadingDbs ? (
                    <div className="flex justify-center py-2">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  ) : (
                    <Select onValueChange={setSelectedDb} value={selectedDb}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una base de datos" />
                      </SelectTrigger>
                      <SelectContent>
                        {databases.map((db) => (
                          <SelectItem key={db.name} value={db.name}>
                            <div className="flex items-center">
                              <Database className="mr-2 h-4 w-4" />
                              {db.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="import-collection">Colección</Label>
                  {isLoadingCollections ? (
                    <div className="flex justify-center py-2">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  ) : (
                    <Select onValueChange={setSelectedCollection} value={selectedCollection} disabled={!selectedDb}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una colección" />
                      </SelectTrigger>
                      <SelectContent>
                        {collections.map((collection) => (
                          <SelectItem key={collection.name} value={collection.name}>
                            <div className="flex items-center">
                              <FolderOpen className="mr-2 h-4 w-4" />
                              {collection.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="import-file">Archivo a Importar</Label>
                <Input id="import-file" type="file" onChange={handleFileChange} />
                <p className="text-sm text-muted-foreground">Selecciona un archivo JSON o CSV para importar</p>
              </div>

              <div className="space-y-2">
                <Label>Opciones de Importación</Label>
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="drop-collection"
                      checked={dropCollection}
                      onChange={(e) => setDropCollection(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="drop-collection">Eliminar colección existente antes de importar</Label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button disabled={!selectedCollection || !selectedFile || isImporting} onClick={importData}>
                  {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Upload className="mr-2 h-4 w-4" />
                  Importar Datos
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

///ya funciona no mover nada todo esta funcionando aqui. 