import { NextResponse } from "next/server"
import { MongoClient } from "mongodb"

// Conectar a MongoDB
async function connectToMongoDB() {
  const uri = process.env.MONGODB_URI || "mongodb://Ali:Lourdes1102@localhost:27017"
  const client = new MongoClient(uri)

  try {
    await client.connect()
    return client
  } catch (error) {
    console.error("Error conectando a MongoDB:", error)
    throw error
  }
}

// Obtener roles
export async function GET() {
  let client

  try {
    client = await connectToMongoDB()
    const admin = client.db("admin")

    // Obtener roles
    const result = await admin.command({ rolesInfo: 1, showBuiltinRoles: true })

    return NextResponse.json({
      success: true,
      roles: result.roles,
    })
  } catch (error) {
    console.error("Error obteniendo roles:", error)
    return NextResponse.json({ success: false, error: "Error obteniendo roles" }, { status: 500 })
  } finally {
    if (client) {
      await client.close()
    }
  }
}

// Crear un nuevo rol
export async function POST(request: Request) {
  let client

  try {
    const { roleName, db, privileges } = await request.json()

    if (!roleName || !db) {
      return NextResponse.json({ success: false, error: "Nombre de rol y base de datos requeridos" }, { status: 400 })
    }

    client = await connectToMongoDB()
    const adminDb = client.db(db)

    // Convertir privilegios al formato esperado por MongoDB
    const formattedPrivileges =
      privileges && privileges.length > 0
        ? privileges.map((priv: { db: any; collection: any; actions: any }) => ({
            resource: { db: priv.db || db, collection: priv.collection || "" },
            actions: priv.actions,
          }))
        : []

    // Crear rol
    await adminDb.command({
      createRole: roleName,
      privileges: formattedPrivileges,
      roles: [],
    })

    return NextResponse.json({
      success: true,
      message: `Rol ${roleName} creado correctamente`,
    })
  } catch (error) {
    console.error("Error creando rol:", error)
    return NextResponse.json({ success: false, error: "Error creando rol" }, { status: 500 })
  } finally {
    if (client) {
      await client.close()
    }
  }
}

///ya funciona no mover nada todo esta funcionando aqui. 