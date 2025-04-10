"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Trash2, Edit, Database, FolderOpen, Loader2 } from "lucide-react"
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

interface DocumentInfo {
  _id: string
  [key: string]: any
}

export default function DatabasePanel() {
  const { toast } = useToast()

  const [databases, setDatabases] = useState<DatabaseInfo[]>([])
  const [collections, setCollections] = useState<CollectionInfo[]>([])
  const [documents, setDocuments] = useState<DocumentInfo[]>([])
  const [documentFields, setDocumentFields] = useState<string[]>([])

  const [selectedDb, setSelectedDb] = useState("")
  const [selectedCollection, setSelectedCollection] = useState("")
  const [newDbName, setNewDbName] = useState("")
  const [newCollectionName, setNewCollectionName] = useState("")
  const [newDocumentJson, setNewDocumentJson] = useState("{}")
  const [editDocumentJson, setEditDocumentJson] = useState("{}")
  const [editDocumentId, setEditDocumentId] = useState("")

  const [isLoadingDbs, setIsLoadingDbs] = useState(false)
  const [isLoadingCollections, setIsLoadingCollections] = useState(false)
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false)
  const [isCreatingDb, setIsCreatingDb] = useState(false)
  const [isCreatingCollection, setIsCreatingCollection] = useState(false)
  const [isCreatingDocument, setIsCreatingDocument] = useState(false)
  const [isEditingDocument, setIsEditingDocument] = useState(false)
  const [isDeletingDocument, setIsDeletingDocument] = useState(false)

  const [createDbOpen, setCreateDbOpen] = useState(false)
  const [createCollectionOpen, setCreateCollectionOpen] = useState(false)
  const [createDocumentOpen, setCreateDocumentOpen] = useState(false)
  const [editDocumentOpen, setEditDocumentOpen] = useState(false)

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

  // Cargar documentos cuando se selecciona una colección
  useEffect(() => {
    if (selectedDb && selectedCollection) {
      fetchDocuments(selectedDb, selectedCollection)
    } else {
      setDocuments([])
    }
  }, [selectedDb, selectedCollection])

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

  // Obtener documentos
  const fetchDocuments = async (dbName: string, collectionName: string) => {
    setIsLoadingDocuments(true)
    try {
      const response = await fetch(`/api/mongodb/documents?db=${dbName}&collection=${collectionName}`)
      const data = await response.json()

      if (data.success) {
        setDocuments(data.documents)

        // Extraer campos para la tabla
        if (data.documents.length > 0) {
          const allFields = new Set<string>()
          data.documents.forEach((doc: any) => {
            Object.keys(doc).forEach((key) => {
              if (key !== "_id") {
                allFields.add(key)
              }
            })
          })
          setDocumentFields(Array.from(allFields))
        } else {
          setDocumentFields([])
        }
      } else {
        toast({
          title: "Error",
          description: data.error || "No se pudieron cargar los documentos",
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
      setIsLoadingDocuments(false)
    }
  }

  // Crear base de datos
  const handleCreateDb = async () => {
    if (!newDbName) return

    setIsCreatingDb(true)
    try {
      const response = await fetch("/api/mongodb/databases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ dbName: newDbName }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Éxito",
          description: `Base de datos ${newDbName} creada correctamente`,
        })
        setNewDbName("")
        setCreateDbOpen(false)
        fetchDatabases()
      } else {
        toast({
          title: "Error",
          description: data.error || "No se pudo crear la base de datos",
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
      setIsCreatingDb(false)
    }
  }

  // Crear colección
  const handleCreateCollection = async () => {
    if (!selectedDb || !newCollectionName) return

    setIsCreatingCollection(true)
    try {
      const response = await fetch("/api/mongodb/collections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dbName: selectedDb,
          collectionName: newCollectionName,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Éxito",
          description: `Colección ${newCollectionName} creada correctamente`,
        })
        setNewCollectionName("")
        setCreateCollectionOpen(false)
        fetchCollections(selectedDb)
      } else {
        toast({
          title: "Error",
          description: data.error || "No se pudo crear la colección",
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
      setIsCreatingCollection(false)
    }
  }

  // Crear documento
  const handleCreateDocument = async () => {
    if (!selectedDb || !selectedCollection) return

    try {
      // Validar JSON
      const documentData = JSON.parse(newDocumentJson)

      setIsCreatingDocument(true)
      const response = await fetch("/api/mongodb/documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dbName: selectedDb,
          collectionName: selectedCollection,
          document: documentData,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Éxito",
          description: "Documento creado correctamente",
        })
        setNewDocumentJson("{}")
        setCreateDocumentOpen(false)
        fetchDocuments(selectedDb, selectedCollection)
      } else {
        toast({
          title: "Error",
          description: data.error || "No se pudo crear el documento",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al procesar el documento",
        variant: "destructive",
      })
    } finally {
      setIsCreatingDocument(false)
    }
  }

  // Editar documento
  const handleEditDocument = async () => {
    if (!selectedDb || !selectedCollection || !editDocumentId) return

    try {
      // Validar JSON
      const documentData = JSON.parse(editDocumentJson)

      setIsEditingDocument(true)
      const response = await fetch(`/api/mongodb/documents/${editDocumentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dbName: selectedDb,
          collectionName: selectedCollection,
          document: documentData,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Éxito",
          description: "Documento actualizado correctamente",
        })
        setEditDocumentJson("{}")
        setEditDocumentId("")
        setEditDocumentOpen(false)
        fetchDocuments(selectedDb, selectedCollection)
      } else {
        toast({
          title: "Error",
          description: data.error || "No se pudo actualizar el documento",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al procesar el documento",
        variant: "destructive",
      })
    } finally {
      setIsEditingDocument(false)
    }
  }

  // Eliminar documento
  const handleDeleteDocument = async (documentId: string) => {
    if (!selectedDb || !selectedCollection) return

    if (!confirm("¿Estás seguro de que deseas eliminar este documento?")) {
      return
    }

    setIsDeletingDocument(true)
    try {
      const response = await fetch(`/api/mongodb/documents/${documentId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dbName: selectedDb,
          collectionName: selectedCollection,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Éxito",
          description: "Documento eliminado correctamente",
        })
        fetchDocuments(selectedDb, selectedCollection)
      } else {
        toast({
          title: "Error",
          description: data.error || "No se pudo eliminar el documento",
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
      setIsDeletingDocument(false)
    }
  }

  // Preparar edición de documento
  const prepareEditDocument = (document: DocumentInfo) => {
    // Eliminar el campo _id para la edición
    const { _id, ...docWithoutId } = document
    setEditDocumentId(_id)
    setEditDocumentJson(JSON.stringify(docWithoutId, null, 2))
    setEditDocumentOpen(true)
  }

  // Formatear tamaño
  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestión de Bases de Datos</h2>

        <Dialog open={createDbOpen} onOpenChange={setCreateDbOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Base de Datos
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nueva Base de Datos</DialogTitle>
              <DialogDescription>Ingresa el nombre para la nueva base de datos.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Nombre
                </Label>
                <Input
                  id="name"
                  value={newDbName}
                  onChange={(e) => setNewDbName(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateDb} disabled={isCreatingDb}>
                {isCreatingDb && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Bases de Datos</CardTitle>
            <CardDescription>Selecciona una base de datos para ver sus colecciones</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingDbs ? (
              <div className="flex justify-center items-center h-32">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : databases.length > 0 ? (
              <div className="space-y-2">
                {databases.map((db) => (
                  <div
                    key={db.name}
                    className={`flex justify-between items-center p-2 rounded-md cursor-pointer ${
                      selectedDb === db.name ? "bg-primary/10" : "hover:bg-muted"
                    }`}
                    onClick={() => setSelectedDb(db.name)}
                  >
                    <div className="flex items-center">
                      <Database className="mr-2 h-4 w-4" />
                      <span>{db.name}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">{formatSize(db.sizeOnDisk)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex justify-center items-center h-32 text-muted-foreground">
                No hay bases de datos disponibles
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>{selectedDb ? `Colecciones en ${selectedDb}` : "Colecciones"}</CardTitle>
                <CardDescription>
                  {selectedDb
                    ? "Selecciona una colección para ver sus documentos"
                    : "Selecciona primero una base de datos"}
                </CardDescription>
              </div>

              {selectedDb && (
                <Dialog open={createCollectionOpen} onOpenChange={setCreateCollectionOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Nueva Colección
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Crear Nueva Colección</DialogTitle>
                      <DialogDescription>Ingresa el nombre para la nueva colección en {selectedDb}.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="collection-name" className="text-right">
                          Nombre
                        </Label>
                        <Input
                          id="collection-name"
                          value={newCollectionName}
                          onChange={(e) => setNewCollectionName(e.target.value)}
                          className="col-span-3"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleCreateCollection} disabled={isCreatingCollection}>
                        {isCreatingCollection && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Crear
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedDb ? (
              isLoadingCollections ? (
                <div className="flex justify-center items-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : collections.length > 0 ? (
                <div className="space-y-2">
                  {collections.map((collection) => (
                    <div
                      key={collection.name}
                      className={`flex justify-between items-center p-2 rounded-md cursor-pointer ${
                        selectedCollection === collection.name ? "bg-primary/10" : "hover:bg-muted"
                      }`}
                      onClick={() => setSelectedCollection(collection.name)}
                    >
                      <div className="flex items-center">
                        <FolderOpen className="mr-2 h-4 w-4" />
                        <span>{collection.name}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {collection.count} documentos | {formatSize(collection.size)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex justify-center items-center h-32 text-muted-foreground">
                  No hay colecciones en esta base de datos
                </div>
              )
            ) : (
              <div className="flex justify-center items-center h-32 text-muted-foreground">
                Selecciona una base de datos para ver sus colecciones
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedDb && selectedCollection && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>
                  Documentos en {selectedDb}.{selectedCollection}
                </CardTitle>
                <CardDescription>Visualiza y gestiona los documentos de esta colección</CardDescription>
              </div>

              <Dialog open={createDocumentOpen} onOpenChange={setCreateDocumentOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Documento
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Crear Nuevo Documento</DialogTitle>
                    <DialogDescription>Ingresa los datos del documento en formato JSON.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <Textarea
                      value={newDocumentJson}
                      onChange={(e) => setNewDocumentJson(e.target.value)}
                      className="font-mono h-64"
                      placeholder="{}"
                    />
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreateDocument} disabled={isCreatingDocument}>
                      {isCreatingDocument && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Crear Documento
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={editDocumentOpen} onOpenChange={setEditDocumentOpen}>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Editar Documento</DialogTitle>
                    <DialogDescription>Modifica los datos del documento en formato JSON.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <Textarea
                      value={editDocumentJson}
                      onChange={(e) => setEditDocumentJson(e.target.value)}
                      className="font-mono h-64"
                    />
                  </div>
                  <DialogFooter>
                    <Button onClick={handleEditDocument} disabled={isEditingDocument}>
                      {isEditingDocument && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Actualizar Documento
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingDocuments ? (
              <div className="flex justify-center items-center h-32">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : documents.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>_id</TableHead>
                      {documentFields.map((field) => (
                        <TableHead key={field}>{field}</TableHead>
                      ))}
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc) => (
                      <TableRow key={doc._id}>
                        <TableCell className="font-mono">{doc._id}</TableCell>
                        {documentFields.map((field) => (
                          <TableCell key={field}>
                            {typeof doc[field] === "object" ? JSON.stringify(doc[field]) : String(doc[field] || "")}
                          </TableCell>
                        ))}
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => prepareEditDocument(doc)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteDocument(doc._id)}
                            disabled={isDeletingDocument}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex justify-center items-center h-32 text-muted-foreground">
                No hay documentos en esta colección
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

///ya funciona no mover nada todo esta funcionando aqui.  