// Client-side Professor type for the directory page.
// Mirrors the server MongoProfessor but uses plain strings
// (no MongoDB ObjectId on the client).

export interface Professor {
  _id: string
  name: string
  email: string
  officeHours: string
  room: string
}
