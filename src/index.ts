import express from 'express'
import { PrismaClient } from '@prisma/client'

const app = express()
const prisma = new PrismaClient()

app.use(express.json())

app.post('/identify', async (req, res) => {
  const { email, phoneNumber } = req.body

  // Validation: at least one of email or phoneNumber must be provided
  if (!email && !phoneNumber) {
    return res.status(400).json({
      error: 'At least one of email or phoneNumber is required'
    })
  }

  // Validation: email format check (must have @ and a domain like .com)
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format'
      })
    }
  }

  // Validation: phone number must be exactly 10 digits
  if (phoneNumber) {
    const phoneStr = String(phoneNumber)
    if (!/^\d{10}$/.test(phoneStr)) {
      return res.status(400).json({
        error: 'Phone number must be exactly 10 digits'
      })
    }
  }

  // Find all contacts that match either email or phone
  const matchingContacts = await prisma.contact.findMany({
    where: {
      OR: [
        email ? { email } : {},
        phoneNumber ? { phoneNumber: String(phoneNumber) } : {}
      ].filter(c => Object.keys(c).length > 0)
    }
  })

  // If no contacts found, create a new primary contact
  if (matchingContacts.length === 0) {
    const newContact = await prisma.contact.create({
      data: {
        email: email || null,
        phoneNumber: phoneNumber ? String(phoneNumber) : null,
        linkPrecedence: 'primary'
      }
    })
    return res.json({
      contact: {
        primaryContatctId: newContact.id,
        emails: newContact.email ? [newContact.email] : [],
        phoneNumbers: newContact.phoneNumber ? [newContact.phoneNumber] : [],
        secondaryContactIds: []
      }
    })
  }

  // Find all primary IDs involved
  const primaryIds = new Set<number>()
  for (const c of matchingContacts) {
    if (c.linkPrecedence === 'primary') primaryIds.add(c.id)
    if (c.linkedId) primaryIds.add(c.linkedId)
  }

  // Get all contacts under these primaries
  const allContacts = await prisma.contact.findMany({
    where: {
      OR: [
        { id: { in: Array.from(primaryIds) } },
        { linkedId: { in: Array.from(primaryIds) } }
      ]
    }
  })

  // The oldest primary is the true primary
  const primaries = allContacts.filter(c => c.linkPrecedence === 'primary')
  primaries.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  const truePrimary = primaries[0]

  // If there are multiple primaries, make the newer ones secondary
  for (const p of primaries.slice(1)) {
    await prisma.contact.update({
      where: { id: p.id },
      data: { linkPrecedence: 'secondary', linkedId: truePrimary.id }
    })
  }

  // Refresh all contacts after update
  const finalContacts = await prisma.contact.findMany({
    where: {
      OR: [
        { id: truePrimary.id },
        { linkedId: truePrimary.id }
      ]
    }
  })

  // Check if the incoming request has new info not in any contact
  const allEmails = finalContacts.map(c => c.email).filter(Boolean)
  const allPhones = finalContacts.map(c => c.phoneNumber).filter(Boolean)

  const isNewEmail = email && !allEmails.includes(email)
  const isNewPhone = phoneNumber && !allPhones.includes(String(phoneNumber))

  if (isNewEmail || isNewPhone) {
    await prisma.contact.create({
      data: {
        email: email || null,
        phoneNumber: phoneNumber ? String(phoneNumber) : null,
        linkedId: truePrimary.id,
        linkPrecedence: 'secondary'
      }
    })
  }

  // Final fetch
  const resultContacts = await prisma.contact.findMany({
    where: {
      OR: [
        { id: truePrimary.id },
        { linkedId: truePrimary.id }
      ]
    }
  })

  const uniqueEmails = [...new Set(resultContacts.map(c => c.email).filter(Boolean))]
  const uniquePhones = [...new Set(resultContacts.map(c => c.phoneNumber).filter(Boolean))]

  // Make sure primary's email and phone are first
  if (truePrimary.email) {
    uniqueEmails.sort((a, b) => a === truePrimary.email ? -1 : 1)
  }
  if (truePrimary.phoneNumber) {
    uniquePhones.sort((a, b) => a === truePrimary.phoneNumber ? -1 : 1)
  }

  const secondaryIds = resultContacts
    .filter(c => c.linkPrecedence === 'secondary')
    .map(c => c.id)

  return res.json({
    contact: {
      primaryContatctId: truePrimary.id,
      emails: uniqueEmails,
      phoneNumbers: uniquePhones,
      secondaryContactIds: secondaryIds
    }
  })
})

app.listen(3000, () => {
  console.log('Server running on port 3000')
})

