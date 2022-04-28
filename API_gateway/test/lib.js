import axios from 'axios';

const url = "http://127.0.0.1:3000/graphql";

export const request = async (query, variables) => {
    try {
        return (await axios.post(
            url,
            { query, variables },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            }
        )).data;
    } catch (error) {
        console.error(error.response.data);
        throw error;
    }
}

export const dictToGraphql = (dict) => {
    let result = '';
    for (const key in dict) {
        result += `${key}:`
        result += JSON.stringify(dict[key]);
        result += ',';
    }

    return result.substring(0, result.length - 1);
}
