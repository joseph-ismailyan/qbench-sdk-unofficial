import { normalizeTokenRecord } from './token-record.js';

/**
 * DynamoDB-backed token storage for AWS Lambda and other AWS runtimes.
 *
 * The adapter dynamically imports @aws-sdk/lib-dynamodb when command classes
 * are not supplied, keeping the AWS SDK optional for non-AWS consumers.
 */
export class DynamoDbTokenStore {
  #client;
  #tableName;
  #partitionKey;
  #ttlAttribute;
  #keyPrefix;
  #consistentRead;
  #commands;

  /**
   * @param {object} options
   * @param {{ send: (command: object) => Promise<object> }} options.client
   * @param {string} options.tableName
   * @param {string} [options.partitionKey='pk']
   * @param {string} [options.ttlAttribute='expiresAtEpochSeconds']
   * @param {string} [options.keyPrefix='qbench-token#']
   * @param {boolean} [options.consistentRead=true]
   * @param {{ GetCommand: Function, PutCommand: Function, DeleteCommand: Function }} [options.commands]
   */
  constructor({
    client,
    tableName,
    partitionKey = 'pk',
    ttlAttribute = 'expiresAtEpochSeconds',
    keyPrefix = 'qbench-token#',
    consistentRead = true,
    commands,
  } = {}) {
    if (!client || typeof client.send !== 'function') {
      throw new TypeError('DynamoDbTokenStore requires a DynamoDB document client.');
    }
    if (!tableName || typeof tableName !== 'string') {
      throw new TypeError('DynamoDbTokenStore requires a tableName.');
    }

    this.#client = client;
    this.#tableName = tableName;
    this.#partitionKey = partitionKey;
    this.#ttlAttribute = ttlAttribute;
    this.#keyPrefix = keyPrefix;
    this.#consistentRead = consistentRead;
    this.#commands = commands;
  }

  async get(key) {
    const { GetCommand } = await this.#getCommands();
    const result = await this.#client.send(
      new GetCommand({
        TableName: this.#tableName,
        Key: { [this.#partitionKey]: this.#storageKey(key) },
        ConsistentRead: this.#consistentRead,
      })
    );

    if (!result?.Item?.token) return null;
    return normalizeTokenRecord(result.Item.token);
  }

  async set(key, token) {
    const record = normalizeTokenRecord(token);
    const { PutCommand } = await this.#getCommands();

    await this.#client.send(
      new PutCommand({
        TableName: this.#tableName,
        Item: {
          [this.#partitionKey]: this.#storageKey(key),
          token: record,
          [this.#ttlAttribute]: Math.floor(record.expiresAt / 1000),
        },
      })
    );
  }

  async deleteIfMatch(key, rejectedAccessToken) {
    const { DeleteCommand } = await this.#getCommands();

    try {
      await this.#client.send(
        new DeleteCommand({
          TableName: this.#tableName,
          Key: { [this.#partitionKey]: this.#storageKey(key) },
          ConditionExpression: '#token.#accessToken = :rejectedAccessToken',
          ExpressionAttributeNames: {
            '#token': 'token',
            '#accessToken': 'accessToken',
          },
          ExpressionAttributeValues: {
            ':rejectedAccessToken': rejectedAccessToken,
          },
        })
      );
      return true;
    } catch (error) {
      if (error?.name === 'ConditionalCheckFailedException') return false;
      throw error;
    }
  }

  #storageKey(key) {
    return `${this.#keyPrefix}${key}`;
  }

  async #getCommands() {
    if (this.#commands) return this.#commands;

    try {
      this.#commands = await import('@aws-sdk/lib-dynamodb');
      return this.#commands;
    } catch (error) {
      throw new Error(
        'DynamoDbTokenStore requires @aws-sdk/lib-dynamodb. Install it or pass command constructors in the adapter options.',
        { cause: error }
      );
    }
  }
}
