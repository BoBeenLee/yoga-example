import { GraphQLServer, PubSub } from 'graphql-yoga'
import { createWriteStream } from 'fs'
import * as mkdirp from 'mkdirp'
import lowdb = require('lowdb')
import FileSync = require('lowdb/adapters/FileSync')
import shortid = require('shortid');

import UpperDirective from './directives/upper';

const uploadDir = './uploads'
const db: any = new lowdb(new FileSync('db.json'))

// Seed an empty DB
db.defaults({ uploads: [] }).write()

// Ensure upload directory exists
mkdirp.sync(uploadDir)

const storeUpload = async ({ stream, filename }): Promise<any> => {
    const id = shortid.generate();
    const path = `${uploadDir}/${id}-${filename}`

    return new Promise((resolve, reject) =>
        stream
            .pipe(createWriteStream(path))
            .on('finish', () => resolve({ id, path }))
            .on('error', reject),
    )
}

const recordFile = file =>
    db.get('uploads')
        .push(file)
        .last()
        .write()

const processUpload = async (upload) => {
    const { stream, filename, mimetype, encoding } = await upload
    const { id, path } = await storeUpload({ stream, filename })
    return recordFile({ id, filename, mimetype, encoding, path })
}

const typeDefs = `
  # this is needed for upload to work
  scalar Upload

  directive @upper on FIELD_DEFINITION

  type Query {
    uploads: [File]
    hello: String! @upper
  }

  type Mutation {
    singleUpload (file: Upload!): File!
    multipleUpload (files: [Upload!]!): [File!]!
  }

  type Subscription {
    counter: Counter!
  }

  type File {
    id: ID!
    path: String!
    filename: String!
    mimetype: String!
    encoding: String!
  }

  type Counter {
    count: Int!
    countStr: String
  }
`
const resolvers = {
    Query: {
        uploads: () => db.get('uploads').value(),
        hello: () => "hello world"
    },
    Counter: {
        countStr: counter => `Current count: ${counter.count}`,
    },
    Mutation: {
        singleUpload: (obj, { file }) => processUpload(file),
        multipleUpload: (obj, { files }) => Promise.all(files.map(processUpload)),
    },
    Subscription: {
        counter: {
            subscribe: (parent, args, { pubsub }) => {
                const channel = Math.random().toString(36).substring(2, 15) // random channel name
                let count = 0
                setInterval(() => pubsub.publish(channel, { counter: { count: count++ } }), 2000)
                return pubsub.asyncIterator(channel)
            },
        }
    }
}

const pubsub = new PubSub();
const server = new GraphQLServer({
    typeDefs,
    resolvers,
    schemaDirectives: {
        upper: UpperDirective
    }, context: { pubsub }
});

server.start(() => console.log('Server is running on http://localhost:4000'))
