import { expect } from "chai";
import { dictToGraphql } from "./lib.js";

describe('lib.js', () => {
    it('Should properly transform a dict to a graphql named parameter string', () => {
        const dict = {
            username: 'hi',
            password: 'ho',
            num: 1,
        }

        const result = dictToGraphql(dict);

        expect(result).to.equal('username:"hi",password:"ho",num:1');
    });
});
