"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAccountNonce = exports.insertAccount = exports.keyPair = void 0;
const ethereumjs_util_1 = require("ethereumjs-util");
const externals_1 = require("ethereumjs-util/dist/externals");
exports.keyPair = {
    secretKey: '0x3cd7232cd6f3fc66a57a6bedc1a8ed6c228fff0a327e169c2bcc5e869ed49511',
    publicKey: '0x0406cc661590d48ee972944b35ad13ff03c7876eae3fd191e8a2f77311b0a3c6613407b5005e63d7d8d76b89d5f900cde691497688bb281e07a5052ff61edebdc0',
};
const insertAccount = (vm, address) => __awaiter(void 0, void 0, void 0, function* () {
    const acctData = {
        nonce: 0,
        balance: new externals_1.BN(10).pow(new externals_1.BN(18)), // 1 eth
    };
    const account = ethereumjs_util_1.Account.fromAccountData(acctData);
    yield vm.stateManager.putAccount(address, account);
});
exports.insertAccount = insertAccount;
const getAccountNonce = (vm, accountPrivateKey) => __awaiter(void 0, void 0, void 0, function* () {
    const address = ethereumjs_util_1.Address.fromPrivateKey(accountPrivateKey);
    const account = yield vm.stateManager.getAccount(address);
    return account.nonce;
});
exports.getAccountNonce = getAccountNonce;
