"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Trash2, User, Shield, Key, Database, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Checkbox } from "@/components/ui/checkbox"

interface UserInfo {
  user: string
  roles: {
    role: string
    db: string
  }[]
}

interface RoleInfo {
  role: string
  db: string
  privileges: {
    resource: {
      db: string
      collection: string
    }
    actions: string[]
  }[]
}

interface DatabaseInfo {
  name: string
  sizeOnDisk: number
  empty: boolean
}

export default function SecurityPanel() {
  const { toast } = useToast()

  const [users, setUsers] = useState<UserInfo[]>([])
  const [roles, setRoles] = useState<RoleInfo[]>([])
  const [databases, setDatabases] = useState<DatabaseInfo[]>([])

  const [newUsername, setNewUsername] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [selectedRole, setSelectedRole] = useState("")
  const [selectedDbs, setSelectedDbs] = useState<string[]>([])

  const [newRoleName, setNewRoleName] = useState("")
  const [newRoleDb, setNewRoleDb] = useState("")
  const [newRolePrivileges, setNewRolePrivileges] = useState<{ db: string; collection: string; actions: string[] }[]>(
    [],
  )

  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [isLoadingRoles, setIsLoadingRoles] = useState(false)
  const [isLoadingDbs, setIsLoadingDbs] = useState(false)
  const [isCreatingUser, setIsCreatingUser] = useState(false)
  const [isCreatingRole, setIsCreatingRole] = useState(false)
  const [isDeletingUser, setIsDeletingUser] = useState(false)
  const [isDeletingRole, setIsDeletingRole] = useState(false)

  const [createUserOpen, setCreateUserOpen] = useState(false)
  const [createRoleOpen, setCreateRoleOpen] = useState(false)

  // Acciones disponibles para roles
  const availableActions = ["find", "insert", "update", "remove", "createCollection", "dropCollection"]

  // Cargar datos al iniciar
  useEffect(() => {
    fetchUsers()
    fetchRoles()
    fetchDatabases()
  }, [])

  // Obtener usuarios
  const fetchUsers = async () => {
    setIsLoadingUsers(true)
    try {
      const response = await fetch("/api/mongodb/security/users")
      const data = await response.json()

      if (data.success) {
        setUsers(data.users)
      } else {
        toast({
          title: "Error",
          description: data.error || "No se pudieron cargar los usuarios",
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
      setIsLoadingUsers(false)
    }
  }

  // Obtener roles
  const fetchRoles = async () => {
    setIsLoadingRoles(true)
    try {
      const response = await fetch("/api/mongodb/security/roles")
      const data = await response.json()

      if (data.success) {
        setRoles(data.roles)
      } else {
        toast({
          title: "Error",
          description: data.error || "No se pudieron cargar los roles",
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
      setIsLoadingRoles(false)
    }
  }

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

  // Crear usuario
  const handleCreateUser = async () => {
    if (!newUsername || !newPassword || !selectedRole) return

    setIsCreatingUser(true)
    try {
      const response = await fetch("/api/mongodb/security/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          role: selectedRole,
          databases: selectedDbs,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Éxito",
          description: `Usuario ${newUsername} creado correctamente`,
        })
        setNewUsername("")
        setNewPassword("")
        setSelectedRole("")
        setSelectedDbs([])
        setCreateUserOpen(false)
        fetchUsers()
      } else {
        toast({
          title: "Error",
          description: data.error || "No se pudo crear el usuario",
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
      setIsCreatingUser(false)
    }
  }

  // Crear rol
  const handleCreateRole = async () => {
    if (!newRoleName || !newRoleDb) return

    setIsCreatingRole(true)
    try {
      const response = await fetch("/api/mongodb/security/roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roleName: newRoleName,
          db: newRoleDb,
          privileges: newRolePrivileges,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Éxito",
          description: `Rol ${newRoleName} creado correctamente`,
        })
        setNewRoleName("")
        setNewRoleDb("")
        setNewRolePrivileges([])
        setCreateRoleOpen(false)
        fetchRoles()
      } else {
        toast({
          title: "Error",
          description: data.error || "No se pudo crear el rol",
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
      setIsCreatingRole(false)
    }
  }

  // Eliminar usuario
  const handleDeleteUser = async (username: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el usuario ${username}?`)) {
      return
    }

    setIsDeletingUser(true)
    try {
      const response = await fetch(`/api/mongodb/security/users/${username}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Éxito",
          description: `Usuario ${username} eliminado correctamente`,
        })
        fetchUsers()
      } else {
        toast({
          title: "Error",
          description: data.error || "No se pudo eliminar el usuario",
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
      setIsDeletingUser(false)
    }
  }

  // Eliminar rol
  const handleDeleteRole = async (roleName: string, db: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el rol ${roleName}?`)) {
      return
    }

    setIsDeletingRole(true)
    try {
      const response = await fetch(`/api/mongodb/security/roles/${roleName}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ db }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Éxito",
          description: `Rol ${roleName} eliminado correctamente`,
        })
        fetchRoles()
      } else {
        toast({
          title: "Error",
          description: data.error || "No se pudo eliminar el rol",
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
      setIsDeletingRole(false)
    }
  }

  // Manejar selección de bases de datos
  const handleDbSelection = (dbName: string) => {
    setSelectedDbs((prev) => (prev.includes(dbName) ? prev.filter((db) => db !== dbName) : [...prev, dbName]))
  }

  // Agregar privilegio
  const addPrivilege = () => {
    setNewRolePrivileges([...newRolePrivileges, { db: "", collection: "", actions: [] }])
  }

  // Actualizar privilegio
  const updatePrivilege = (index: number, field: string, value: string) => {
    const updated = [...newRolePrivileges]
    updated[index] = { ...updated[index], [field]: value }
    setNewRolePrivileges(updated)
  }

  // Actualizar acciones de privilegio
  const updatePrivilegeAction = (index: number, action: string, checked: boolean) => {
    const updated = [...newRolePrivileges]
    if (checked) {
      updated[index].actions = [...updated[index].actions, action]
    } else {
      updated[index].actions = updated[index].actions.filter((a) => a !== action)
    }
    setNewRolePrivileges(updated)
  }

  // Eliminar privilegio
  const removePrivilege = (index: number) => {
    setNewRolePrivileges((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Administración de Seguridad</h2>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4 p-4 border rounded-md mt-2">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Usuarios de MongoDB</h3>

            <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Usuario
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                  <DialogDescription>Ingresa los detalles para el nuevo usuario de MongoDB</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="username" className="text-right">
                      Usuario
                    </Label>
                    <Input
                      id="username"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="password" className="text-right">
                      Contraseña
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="role" className="text-right">
                      Rol
                    </Label>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Selecciona un rol" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={`${role.role}-${role.db}`} value={role.role}>
                            {role.role} ({role.db})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label className="text-right pt-2">Bases de Datos</Label>
                    <div className="col-span-3 space-y-2">
                      {isLoadingDbs ? (
                        <div className="flex justify-center py-2">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        </div>
                      ) : (
                        databases.map((db) => (
                          <div key={db.name} className="flex items-center space-x-2">
                            <Checkbox
                              id={`db-${db.name}`}
                              checked={selectedDbs.includes(db.name)}
                              onCheckedChange={() => handleDbSelection(db.name)}
                            />
                            <Label htmlFor={`db-${db.name}`}>{db.name}</Label>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleCreateUser}
                    disabled={isCreatingUser || !newUsername || !newPassword || !selectedRole}
                  >
                    {isCreatingUser && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Crear Usuario
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              {isLoadingUsers ? (
                <div className="flex justify-center items-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : users.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Bases de Datos</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.user}>
                        <TableCell>
                          <div className="flex items-center">
                            <User className="mr-2 h-4 w-4" />
                            {user.user}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.roles.map((role) => (
                              <span
                                key={`${role.role}-${role.db}`}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
                              >
                                <Shield className="mr-1 h-3 w-3" />
                                {role.role} ({role.db})
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.roles.map((role) => (
                              <span
                                key={`${role.role}-${role.db}-db`}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted"
                              >
                                <Database className="mr-1 h-3 w-3" />
                                {role.db}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteUser(user.user)}
                            disabled={isDeletingUser || user.user === "admin"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex justify-center items-center h-32 text-muted-foreground">
                  No hay usuarios disponibles
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4 p-4 border rounded-md mt-2">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Roles de MongoDB</h3>

            <Dialog open={createRoleOpen} onOpenChange={setCreateRoleOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Rol
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Crear Nuevo Rol</DialogTitle>
                  <DialogDescription>Define un nuevo rol con privilegios específicos</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="role-name" className="text-right">
                      Nombre
                    </Label>
                    <Input
                      id="role-name"
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="role-db" className="text-right">
                      Base de Datos
                    </Label>
                    <Select value={newRoleDb} onValueChange={setNewRoleDb}>
                      <SelectTrigger className="col-span-3">
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
                  </div>

                  <div className="grid grid-cols-4 items-start gap-4">
                    <div className="text-right">
                      <Label>Privilegios</Label>
                      <Button variant="outline" size="sm" className="mt-2" onClick={addPrivilege}>
                        <Plus className="h-3 w-3 mr-1" />
                        Agregar
                      </Button>
                    </div>
                    <div className="col-span-3 space-y-4">
                      {newRolePrivileges.map((privilege, index) => (
                        <div key={index} className="border p-3 rounded-md space-y-3">
                          <div className="flex justify-between items-center">
                            <Label>Privilegio {index + 1}</Label>
                            <Button variant="ghost" size="sm" onClick={() => removePrivilege(index)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label htmlFor={`priv-db-${index}`}>Base de Datos</Label>
                              <Input
                                id={`priv-db-${index}`}
                                value={privilege.db}
                                onChange={(e) => updatePrivilege(index, "db", e.target.value)}
                                placeholder="nombre_db o *"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`priv-coll-${index}`}>Colección</Label>
                              <Input
                                id={`priv-coll-${index}`}
                                value={privilege.collection}
                                onChange={(e) => updatePrivilege(index, "collection", e.target.value)}
                                placeholder="nombre_coleccion o *"
                              />
                            </div>
                          </div>
                          <div>
                            <Label>Acciones</Label>
                            <div className="grid grid-cols-2 gap-2 mt-1">
                              {availableActions.map((action) => (
                                <div key={action} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`action-${index}-${action}`}
                                    checked={privilege.actions.includes(action)}
                                    onCheckedChange={(checked) =>
                                      updatePrivilegeAction(index, action, checked === true)
                                    }
                                  />
                                  <Label htmlFor={`action-${index}-${action}`}>{action}</Label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}

                      {newRolePrivileges.length === 0 && (
                        <div className="text-center text-muted-foreground py-2">No hay privilegios definidos</div>
                      )}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleCreateRole} disabled={isCreatingRole || !newRoleName || !newRoleDb}>
                    {isCreatingRole && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Crear Rol
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              {isLoadingRoles ? (
                <div className="flex justify-center items-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : roles.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Base de Datos</TableHead>
                      <TableHead>Privilegios</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roles.map((role) => (
                      <TableRow key={`${role.role}-${role.db}`}>
                        <TableCell>
                          <div className="flex items-center">
                            <Shield className="mr-2 h-4 w-4" />
                            {role.role}
                          </div>
                        </TableCell>
                        <TableCell>{role.db}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(role.privileges || []).map((priv, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted"
                                title={priv.actions.join(", ")}
                              >
                                <Key className="mr-1 h-3 w-3" />
                                {priv.resource.db}.{priv.resource.collection}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteRole(role.role, role.db)}
                            disabled={isDeletingRole || role.role === "root"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex justify-center items-center h-32 text-muted-foreground">
                  No hay roles disponibles
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

///ya funciona no mover nada todo esta funcionando aqui. 