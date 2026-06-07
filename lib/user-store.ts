export interface User {
  id: string
  name: string
  email: string
  password: string
  role: "manager" | "pos_user"
  assignedTerminals: string[]
  status: "active" | "inactive"
  createdAt: string
  lastLogin: string
}

const DEFAULT_USERS: User[] = [
  {
    id: "user-01",
    name: "Admin",
    email: "admin@myquickpos.app",
    password: "admin",
    role: "manager",
    assignedTerminals: [],
    status: "active",
    createdAt: "2025-10-01",
    lastLogin: new Date().toISOString(),
  },
  {
    id: "user-02",
    name: "Alex Johnson",
    email: "alex@myquickpos.app",
    password: "cashier",
    role: "pos_user",
    assignedTerminals: ["terminal-01"],
    status: "active",
    createdAt: "2025-11-15",
    lastLogin: new Date().toISOString(),
  },
  {
    id: "user-03",
    name: "Maria Garcia",
    email: "maria@myquickpos.app",
    password: "cashier",
    role: "pos_user",
    assignedTerminals: ["terminal-02"],
    status: "active",
    createdAt: "2025-12-01",
    lastLogin: new Date().toISOString(),
  },
  {
    id: "user-04",
    name: "James Lee",
    email: "james@myquickpos.app",
    password: "cashier",
    role: "pos_user",
    assignedTerminals: ["terminal-01", "terminal-03"],
    status: "active",
    createdAt: "2026-01-05",
    lastLogin: "2026-02-10T14:22:00.000Z",
  },
  {
    id: "user-05",
    name: "Sarah Miller",
    email: "sarah@myquickpos.app",
    password: "manager",
    role: "manager",
    assignedTerminals: [],
    status: "inactive",
    createdAt: "2026-01-20",
    lastLogin: "2026-01-25T09:00:00.000Z",
  },
]

let users: User[] = [...DEFAULT_USERS]
let listeners: (() => void)[] = []

function emit() {
  listeners.forEach((l) => l())
}

export function getUsers(): User[] {
  return users
}

export function getUser(id: string): User | undefined {
  return users.find((u) => u.id === id)
}

export function getUserByEmail(email: string): User | undefined {
  return users.find((u) => u.email === email)
}

export function authenticate(email: string, password: string): User | null {
  const user = users.find(
    (u) => u.email === email && u.password === password && u.status === "active"
  )
  if (user) {
    users = users.map((u) =>
      u.id === user.id ? { ...u, lastLogin: new Date().toISOString() } : u
    )
    emit()
    return { ...user, lastLogin: new Date().toISOString() }
  }
  return null
}

export function addUser(
  config: Omit<User, "id" | "createdAt" | "lastLogin">
): User {
  const id = `user-${String(users.length + 1).padStart(2, "0")}`
  const newUser: User = {
    ...config,
    id,
    createdAt: new Date().toISOString().split("T")[0],
    lastLogin: "Never",
  }
  users = [...users, newUser]
  emit()
  return newUser
}

export function updateUser(
  id: string,
  updates: Partial<User>
): User | undefined {
  const idx = users.findIndex((u) => u.id === id)
  if (idx === -1) return undefined
  users = users.map((u, i) => (i === idx ? { ...u, ...updates } : u))
  emit()
  return users[idx]
}

export function deleteUser(id: string): boolean {
  const len = users.length
  users = users.filter((u) => u.id !== id)
  if (users.length !== len) {
    emit()
    return true
  }
  return false
}

export function getPosUsers(): User[] {
  return users.filter((u) => u.role === "pos_user")
}

export function subscribe(listener: () => void) {
  listeners = [...listeners, listener]
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}
