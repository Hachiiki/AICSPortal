// Regression tests for the seed remote-guard hostname classification
// (credential-rotation review finding F2, issue #72 follow-up).
//
// The original substring guard (/127\.0\.0\.1|localhost/ over the whole
// URI) misclassified remote hosts whose credentials or subdomains
// contain those strings. These tests pin the parsed-hostname behavior.

import { describe, expect, it } from 'bun:test'
import { isLocalMongoUri } from './uri-local'

describe('isLocalMongoUri — explicit loopbacks are LOCAL', () => {
  it('accepts plain loopback hosts', () => {
    for (const uri of [
      'mongodb://127.0.0.1:27017',
      'mongodb://localhost:27017',
      'mongodb://LOCALHOST:27017', // WHATWG URL lowercases hostnames
      'mongodb://127.0.0.1:29099/aics_portal',
      'mongodb://127.42.0.9:27017', // any 127.0.0.0/8 address is loopback
      'mongodb://[::1]:27017',
    ]) {
      expect(isLocalMongoUri(uri)).toBe(true)
    }
  })
  it('accepts loopback hosts WITH credentials attached', () => {
    for (const uri of [
      'mongodb://user:pass@localhost/db',
      'mongodb://user:pass@127.0.0.1:27017',
      'mongodb://user:p%40ss@localhost:27017/db', // URL-encoded '@' in password
    ]) {
      expect(isLocalMongoUri(uri)).toBe(true)
    }
  })
})

describe('isLocalMongoUri — remote hosts are REMOTE', () => {
  it('classifies real remote hosts as remote', () => {
    for (const uri of [
      'mongodb+srv://cluster0.x6tc5le.mongodb.net',
      'mongodb+srv://user:secret@cluster0.example.mongodb.net',
      'mongodb://db.example.net:27017',
      'mongodb://10.0.0.5:27017',
      'mongodb://192.168.1.4:27017',
      'mongodb://172.17.0.2:27017',
    ]) {
      expect(isLocalMongoUri(uri)).toBe(false)
    }
  })
  it('classifies lookalike unspecified/routable forms as remote (conservative)', () => {
    for (const uri of [
      'mongodb://0.0.0.0:27017',
      'mongodb://[::ffff:127.0.0.1]:27017',
    ]) {
      expect(isLocalMongoUri(uri)).toBe(false)
    }
  })
})

describe('isLocalMongoUri — DECEPTIVE URIs that defeated the old substring guard', () => {
  it('credentials containing localhost/127.0.0.1 stay REMOTE (the F2 bypass)', () => {
    for (const uri of [
      'mongodb://user:my-localhost-pw@remote.example.net:27017',
      'mongodb://user:pass-with-127.0.0.1@remote.example.net',
      'mongodb://localhost-user@remote.example.net',
      'mongodb+srv://user:localhostpw@cluster0.example.mongodb.net',
      'mongodb://user:pw@localhost.evil.example/db',
      'mongodb://user:pw@127.0.0.1.evil.example/db',
      'mongodb://127-0-0-1.example.net:27017',
    ]) {
      expect(isLocalMongoUri(uri)).toBe(false)
    }
  })
})

describe('isLocalMongoUri — fail-closed on malformed input', () => {
  it('treats unparseable or non-string URIs as remote', () => {
    for (const uri of [
      '',
      'not-a-uri',
      'mongodb:',
      'mongodb://',
      '://nope',
      'mongodb://h1,h2:27017', // multi-host replica-set form (no single hostname)
      undefined,
      null,
      42,
      {},
    ] as unknown[]) {
      expect(isLocalMongoUri(uri as string)).toBe(false)
    }
  })
})
