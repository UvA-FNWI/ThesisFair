import axios from 'axios';

let url = "http://127.0.0.1:3000/";
let apiToken = null;
let apiTokenData = null;

export const getTokenData = () => apiTokenData;

export const login = async (email, password) => {
  const res = await axios.post(url + 'login',
    { email, password },
    {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        Authorization: `Bearer ${JSON.stringify(apiToken)}`
      },
    }
  );

  if (res.data.errors) {
    console.error(res.data.errors);
    throw new Error(res.data.errors[0].message);
  }

  apiToken = res.data.data.apiToken;
  const split = apiToken.split('.');
  if (split.length !== 3) {
    throw new Error(`Received invalid token. Token has ${split.length} parts, expected 3.`);
  }

  const payload = (new Buffer.from(split[1], 'base64')).toString();
  apiTokenData = JSON.parse(payload);

  return apiTokenData;
};

export const request = async (query, variables, shouldSucceed = true) => {
  let result;
  try {
    result = await axios.post(
      url + 'graphql',
      { query, variables },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          Authorization: `Bearer ${apiToken}`
        },
      }
    );
  } catch (error) {
    if (shouldSucceed) {
      console.log(query, variables);
      console.error(error.response.data);
      throw error;
    }

    return error.response.data;
  }

  if (shouldSucceed && result.data.errors) {
    console.log(result.data);
  }

  return result.data;
}

const serializeValue = (val) => {
  switch (typeof val) {
    case 'boolean':
      return val.toString();

    case 'number':
      return val.toString();

    case 'string':
      return JSON.stringify(val);

    case 'object':
      if (val instanceof Array) {
        let result = '[';
        for (const arr of val) {
          result += serializeValue(arr) + ',';
        }
        return result.substring(0, result.length - 1) + ']'
      } else {
        let result = '{';
        for (const key in val) {
          result += `${key}:${serializeValue(val[key])},`
        }

        return result.substring(0, result.length - 1) + '}';
      }

    default:
      break;
  }
}

export const dictToGraphql = (dict) => {
  const result = serializeValue(dict);
  return result.substring(1, result.length - 1);
}

export class Builder {
  constructor(operation, name = '') {
    this.operation = operation;
    this.name = name;
    this.queries = [];
  }

  addQuery(query) {
    this.queries.push(query);
  }
}
