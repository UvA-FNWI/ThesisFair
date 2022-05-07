import axios from 'axios';

let url = "http://127.0.0.1:3000/graphql";
let apiToken = null;

export const setUrl = (newUrl) => {
    url = newUrl;
}

export const login = async (username, password) => {
  switch (username) {
    case 'admin':
      apiToken = { type: 'a' };
      break;

    case 'rep':
      apiToken = { type: 'r', evid: '62728401f41b2cfc83a7035b' };
      break;

    case 'student':
      apiToken = { type: 's' };
      break;

    default:
      throw new Error('Unkown username');
  }
}

export const request = async (query, variables, shouldSucceed = true) => {
  let result;
  try {
    result = await axios.post(
      url,
      { query, variables },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          Authorization: `Bearer ${JSON.stringify(apiToken)}`
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

  return result.data;
}

class EnumType {
  custom = true;

  constructor(string) {
    this.string = string;
  }

  toString() {
    return this.string;
  }
}
export const Enum = (name) => new EnumType(name);

const serializeValue = (val) => {
    switch (typeof val) {
        case 'boolean':
            return val.toString();

        case 'number':
            return val.toString();

        case 'string':
            return '"' + val + '"';

        case 'object':
            if (val instanceof EnumType) {
                return val.toString();
            } else if (val instanceof Array) {
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

export const dictToSimpleDict = (dict) => {
    const res = {...dict};
    for (const key in res) {
      if (typeof res[key] !== 'object') {
        continue;
      }

      if (res[key].custom) {
        res[key] = res[key].toString();
      } else if (Array.isArray(res[key])) {
        res[key] = [...res[key]];
        for (const index in res[key]) {
            res[key][index] = dictToSimpleDict(res[key][index]);
        }
      } else {
        res[key] = dictToSimpleDict(res[key]);
      }
    }

    return res;
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
