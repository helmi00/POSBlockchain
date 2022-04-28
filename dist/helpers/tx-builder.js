"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTransaction = exports.encodeDeployment = exports.encodeFunction = void 0;
const abi_1 = require("@ethersproject/abi");
const ethereumjs_util_1 = require("ethereumjs-util");
const encodeFunction = (method, params) => {
    var _a, _b;
    const parameters = (_a = params === null || params === void 0 ? void 0 : params.types) !== null && _a !== void 0 ? _a : [];
    const methodWithParameters = `function ${method}(${parameters.join(',')})`;
    const signatureHash = new abi_1.Interface([methodWithParameters]).getSighash(method);
    const encodedArgs = abi_1.defaultAbiCoder.encode(parameters, (_b = params === null || params === void 0 ? void 0 : params.values) !== null && _b !== void 0 ? _b : []);
    return signatureHash + encodedArgs.slice(2);
};
exports.encodeFunction = encodeFunction;
const encodeDeployment = (bytecode, params) => {
    const deploymentData = '0x' + bytecode;
    if (params) {
        const argumentsEncoded = abi_1.defaultAbiCoder.encode(params.types, params.values);
        return deploymentData + argumentsEncoded.slice(2);
    }
    return deploymentData;
};
exports.encodeDeployment = encodeDeployment;
const buildTransaction = (data) => {
    const defaultData = {
        nonce: new ethereumjs_util_1.BN(0),
        gasLimit: 2000000,
        gasPrice: 1,
        value: 0,
        data: '0x',
    };
    return Object.assign(Object.assign({}, defaultData), data);
};
exports.buildTransaction = buildTransaction;
