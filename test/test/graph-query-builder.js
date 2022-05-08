import { expect } from "chai";
import { dictToGraphql } from '../../libraries/graphql-query-builder/index.js';

describe('lib.js', () => {
    it('Should properly transform a dict to a graphql named parameter string', () => {
        const dict = {
            username: 'hi',
            password: 'ho',
            num: 1,
            enum: 'test',
            bool: true,
            obj: { enum: 'test' },
            arr: [{ enum: 'test' }, { enum: 'test' }],
        }

        const result = dictToGraphql(dict);

        expect(result).to.equal('username:"hi",password:"ho",num:1,enum:"test",bool:true,obj:{enum:"test"},arr:[{enum:"test"},{enum:"test"}]');
    });
});
