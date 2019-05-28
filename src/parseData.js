// TODO: This ended up being much easier to use another lib for, anything useful here?

// import TELNET, { ppt } from "./telnet";

// export default function parseData(message) {
//     const buffer = Buffer.alloc(message.length);
//     let actions = [];
//     let sbOffset;
//     let sbData;
//     const IAC_OFFSET = 2;

//     for (let index = 0; index < message.length; index += 1) {
//         if (message[index] !== TELNET.IAC) {
//             buffer[index] = message[index];
//             message[index] = 0;
//             continue;
//         }
//         const action = message[index + 1];
//         const option = message[index + 2];
//         switch (action) {
//             case TELNET.WILL:
//             case TELNET.WONT:
//             case TELNET.DO:
//             case TELNET.DONT:
//                 console.log("IAC", ppt(action), ppt(option));
//                 if (TELNET[option]) {
//                     actions = [...actions, { action: TELNET[action], option: TELNET[option] }];
//                 }
//                 index += IAC_OFFSET;
//                 break;
//             case TELNET.SB:
//                 console.log("IACSB", ppt(action), ppt(option));
//                 sbOffset = index + 2;
//                 sbData = null;
//                 while (sbOffset < message.length) {
//                     if (message[sbOffset] === TELNET.SE) {
//                         sbData = message.slice(index + 2, sbOffset-1);
//                         break;
//                     }
//                     sbOffset += 1;
//                 }
//                 index = sbOffset;
//                 actions = [...actions, { action: TELNET[action], option: TELNET[option], sbData: [...sbData] }];
//                 break;
//             default:
//                 console.log("IAC", ppt(action), ppt(option), action, option);
//                 index += IAC_OFFSET;
//                 break;
//         }
//     }
//     return {
//         actions,
//         message: buffer.toString()
//     };
// }
