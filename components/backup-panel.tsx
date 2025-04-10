"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, Upload, Calendar, Database, FileArchive, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface DatabaseInfo {
  name: string
  sizeOnDisk: number
  empty: boolean
}

interface BackupInfo {
  id: string
  database: string
  timestamp: string
  size: string
  path: string
}

export default function BackupPanel() {
  const { toast } = useToast()

  const [backups, setBackups] = useState<BackupInfo[]>([])
  const [databases, setDatabases] = useState<DatabaseInfo[]>([])

  const [selectedDb, setSelectedDb] = useState("")
  const [backupName, setBackupName] = useState("")
  const [restoreDbName, setRestoreDbName] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const [isLoadingDbs, setIsLoadingDbs] = useState(false)
  const [isLoadingBackups, setIsLoadingBackups] = useState(false)
  const [isCreatingBackup, setIsCreatingBackup] = useState(false)
  const [isRestoringBackup, setIsRestoringBackup] = useState(false)
  const [isUploadingBackup, setIsUploadingBackup] = useState(false)

  // Cargar bases de datos y respaldos al iniciar
  useEffect(() => {
    fetchDatabases()
    fetchBackups()
  }, [])

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

  // Obtener respaldos
  const fetchBackups = async () => {
    setIsLoadingBackups(true)
    try {
      const response = await fetch("/api/mongodb/backup")
      const data = await response.json()

      if (data.success) {
        setBackups(data.backups)
      } else {
        toast({
          title: "Error",
          description: data.error || "No se pudieron cargar los respaldos",
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
      setIsLoadingBackups(false)
    }
  }

  // Crear respaldo
  const createBackup = async () => {
    if (!selectedDb) return

    setIsCreatingBackup(true)
    try {
      const response = await fetch("/api/mongodb/backup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dbName: selectedDb,
          backupName: backupName || undefined,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Éxito",
          description: `Respaldo de ${selectedDb} creado correctamente`,
        })
        fetchBackups()
      } else {
        toast({
          title: "Error",
          description: data.error || "No se pudo crear el respaldo",
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
      setIsCreatingBackup(false)
    }
  }

  // Restaurar respaldo
  const restoreBackup = async (backupId: string) => {
    if (
      !confirm("¿Estás seguro de que deseas restaurar este respaldo? Esta acción reemplazará los datos existentes.")
    ) {
      return
    }

    setIsRestoringBackup(true)
    try {
      const response = await fetch("/api/mongodb/backup/restore", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ backupId }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Éxito",
          description: "Respaldo restaurado correctamente",
        })
        fetchDatabases()
      } else {
        toast({
          title: "Error",
          description: data.error || "No se pudo restaurar el respaldo",
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
      setIsRestoringBackup(false)
    }
  }

  // Descargar respaldo
  const downloadBackup = async (backupId: string) => {
    try {
      window.open(`/api/mongodb/backup/download?backupId=${backupId}`, "_blank")
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo descargar el respaldo",
        variant: "destructive",
      })
    }
  }

  // Subir y restaurar respaldo
  const uploadAndRestoreBackup = async () => {
    if (!selectedFile || !restoreDbName) return

    setIsUploadingBackup(true)
    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("dbName", restoreDbName)

      const response = await fetch("/api/mongodb/backup/upload", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Éxito",
          description: `Respaldo restaurado en ${restoreDbName} correctamente`,
        })
        setSelectedFile(null)
        setRestoreDbName("")
        fetchDatabases()
        fetchBackups()
      } else {
        toast({
          title: "Error",
          description: data.error || "No se pudo restaurar el respaldo",
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
      setIsUploadingBackup(false)
    }
  }

  // Manejar cambio de archivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0])
    }
  }

  // Formatear fecha
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleString()
    } catch (e) {
      return dateString
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Respaldos y Restauración</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Crear Respaldo</CardTitle>
            <CardDescription>Selecciona una base de datos para crear un respaldo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="database">Base de Datos</Label>
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
                        {db.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="backup-name">Nombre del Respaldo (opcional)</Label>
              <Input
                id="backup-name"
                placeholder="respaldo_20231105"
                value={backupName}
                onChange={(e) => setBackupName(e.target.value)}
              />
            </div>

            <Button className="w-full" disabled={!selectedDb || isCreatingBackup} onClick={createBackup}>
              {isCreatingBackup && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Download className="mr-2 h-4 w-4" />
              Crear Respaldo
            </Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Respaldos Disponibles</CardTitle>
            <CardDescription>Gestiona los respaldos existentes</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingBackups ? (
              <div className="flex justify-center items-center h-32">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : backups.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Base de Datos</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tamaño</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backups.map((backup) => (
                    <TableRow key={backup.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <Database className="mr-2 h-4 w-4" />
                          {backup.database}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Calendar className="mr-2 h-4 w-4" />
                          {formatDate(backup.timestamp)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <FileArchive className="mr-2 h-4 w-4" />
                          {backup.size}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" className="mr-2" onClick={() => downloadBackup(backup.id)}>
                          <Download className="mr-2 h-4 w-4" />
                          Descargar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => restoreBackup(backup.id)}
                          disabled={isRestoringBackup}
                        >
                          {isRestoringBackup && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          <Upload className="mr-2 h-4 w-4" />
                          Restaurar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex justify-center items-center h-32 text-muted-foreground">
                No hay respaldos disponibles
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Restaurar desde Archivo</CardTitle>
          <CardDescription>Sube un archivo de respaldo para restaurar una base de datos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="restore-db">Base de Datos Destino</Label>
              <Input
                id="restore-db"
                placeholder="Nombre de la base de datos"
                value={restoreDbName}
                onChange={(e) => setRestoreDbName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="backup-file">Archivo de Respaldo</Label>
              <Input id="backup-file" type="file" onChange={handleFileChange} />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={uploadAndRestoreBackup} disabled={!selectedFile || !restoreDbName || isUploadingBackup}>
              {isUploadingBackup && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Upload className="mr-2 h-4 w-4" />
              Restaurar Base de Datos
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

///ya funciona no mover nada todo esta funcionando aqui. 