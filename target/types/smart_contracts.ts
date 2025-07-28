/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/smart_contracts.json`.
 */
export type SmartContracts = {
  "address": "Afja4Q8urL5j8Hn3PpCkgP2Tgpe8xtp98khPmAVZF5Vk",
  "metadata": {
    "name": "smartContracts",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "cancelTask",
      "discriminator": [
        69,
        228,
        134,
        187,
        134,
        105,
        238,
        48
      ],
      "accounts": [
        {
          "name": "taskAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  97,
                  115,
                  107
                ]
              },
              {
                "kind": "account",
                "path": "task_account.creator",
                "account": "taskAccount"
              },
              {
                "kind": "account",
                "path": "task_account.task_id",
                "account": "taskAccount"
              }
            ]
          }
        },
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "rewardVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "taskAccount"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "createTask",
      "discriminator": [
        194,
        80,
        6,
        180,
        232,
        127,
        48,
        171
      ],
      "accounts": [
        {
          "name": "taskAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  97,
                  115,
                  107
                ]
              },
              {
                "kind": "account",
                "path": "creator"
              },
              {
                "kind": "arg",
                "path": "taskId"
              }
            ]
          }
        },
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "taskId",
          "type": "u64"
        },
        {
          "name": "rewardPerResponse",
          "type": "u64"
        },
        {
          "name": "maxResponses",
          "type": "u16"
        },
        {
          "name": "deadline",
          "type": "i64"
        },
        {
          "name": "cid",
          "type": "string"
        }
      ]
    },
    {
      "name": "delegateTaskAccount",
      "discriminator": [
        71,
        106,
        16,
        90,
        137,
        161,
        102,
        241
      ],
      "accounts": [
        {
          "name": "creator",
          "signer": true
        },
        {
          "name": "bufferTaskAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "taskAccount"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                143,
                165,
                99,
                25,
                117,
                108,
                133,
                228,
                182,
                107,
                2,
                86,
                120,
                97,
                20,
                28,
                179,
                102,
                90,
                245,
                48,
                126,
                88,
                177,
                80,
                99,
                207,
                145,
                11,
                27,
                185,
                3
              ]
            }
          }
        },
        {
          "name": "delegationRecordTaskAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "taskAccount"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "delegationMetadataTaskAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110,
                  45,
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "taskAccount"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "taskAccount",
          "writable": true
        },
        {
          "name": "ownerProgram",
          "address": "Afja4Q8urL5j8Hn3PpCkgP2Tgpe8xtp98khPmAVZF5Vk"
        },
        {
          "name": "delegationProgram",
          "address": "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "taskId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "depositFunds",
      "discriminator": [
        202,
        39,
        52,
        211,
        53,
        20,
        250,
        88
      ],
      "accounts": [
        {
          "name": "taskAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  97,
                  115,
                  107
                ]
              },
              {
                "kind": "account",
                "path": "creator"
              },
              {
                "kind": "arg",
                "path": "taskId"
              }
            ]
          }
        },
        {
          "name": "rewardVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "taskAccount"
              }
            ]
          }
        },
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "taskId",
          "type": "u64"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "disburseRewards",
      "discriminator": [
        171,
        229,
        60,
        0,
        227,
        3,
        4,
        158
      ],
      "accounts": [
        {
          "name": "taskAccount",
          "writable": true
        },
        {
          "name": "rewardVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "taskAccount"
              }
            ]
          }
        },
        {
          "name": "recipient",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "markTaskComplete",
      "discriminator": [
        129,
        60,
        159,
        111,
        47,
        75,
        60,
        136
      ],
      "accounts": [
        {
          "name": "taskAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  97,
                  115,
                  107
                ]
              },
              {
                "kind": "account",
                "path": "task_account.creator",
                "account": "taskAccount"
              },
              {
                "kind": "account",
                "path": "task_account.task_id",
                "account": "taskAccount"
              }
            ]
          }
        },
        {
          "name": "creator",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "processUndelegation",
      "discriminator": [
        196,
        28,
        41,
        206,
        48,
        37,
        51,
        167
      ],
      "accounts": [
        {
          "name": "baseAccount",
          "writable": true
        },
        {
          "name": "buffer"
        },
        {
          "name": "payer",
          "writable": true
        },
        {
          "name": "systemProgram"
        }
      ],
      "args": [
        {
          "name": "accountSeeds",
          "type": {
            "vec": "bytes"
          }
        }
      ]
    },
    {
      "name": "refundRemaining",
      "discriminator": [
        199,
        38,
        153,
        103,
        248,
        172,
        243,
        248
      ],
      "accounts": [
        {
          "name": "taskAccount",
          "writable": true
        },
        {
          "name": "rewardVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "taskAccount"
              }
            ]
          }
        },
        {
          "name": "creator",
          "writable": true,
          "signer": true,
          "relations": [
            "taskAccount"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "submitResponse",
      "discriminator": [
        85,
        190,
        208,
        119,
        243,
        52,
        133,
        90
      ],
      "accounts": [
        {
          "name": "taskAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  97,
                  115,
                  107
                ]
              },
              {
                "kind": "account",
                "path": "task_account.creator",
                "account": "taskAccount"
              },
              {
                "kind": "account",
                "path": "task_account.task_id",
                "account": "taskAccount"
              }
            ]
          }
        },
        {
          "name": "responseAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  112,
                  111,
                  110,
                  115,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "taskAccount"
              },
              {
                "kind": "account",
                "path": "responder"
              }
            ]
          }
        },
        {
          "name": "responder",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "cid",
          "type": "string"
        }
      ]
    },
    {
      "name": "undelegateTaskAccount",
      "discriminator": [
        201,
        104,
        83,
        58,
        81,
        253,
        21,
        82
      ],
      "accounts": [
        {
          "name": "creator",
          "signer": true
        },
        {
          "name": "taskAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  97,
                  115,
                  107
                ]
              },
              {
                "kind": "account",
                "path": "task_account.creator",
                "account": "taskAccount"
              },
              {
                "kind": "account",
                "path": "task_account.task_id",
                "account": "taskAccount"
              }
            ]
          }
        },
        {
          "name": "magicProgram",
          "address": "Magic11111111111111111111111111111111111111"
        },
        {
          "name": "magicContext",
          "writable": true,
          "address": "MagicContext1111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "verifyResponse",
      "discriminator": [
        205,
        63,
        175,
        138,
        128,
        61,
        225,
        75
      ],
      "accounts": [
        {
          "name": "responseAccount",
          "writable": true
        },
        {
          "name": "signer",
          "signer": true
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "responseAccount",
      "discriminator": [
        136,
        150,
        125,
        240,
        7,
        27,
        61,
        60
      ]
    },
    {
      "name": "rewardVaultAccount",
      "discriminator": [
        58,
        86,
        0,
        57,
        129,
        40,
        21,
        47
      ]
    },
    {
      "name": "taskAccount",
      "discriminator": [
        235,
        32,
        10,
        23,
        81,
        60,
        170,
        203
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidTaskId",
      "msg": "Task ID must be non-zero."
    },
    {
      "code": 6001,
      "name": "invalidReward",
      "msg": "Reward per response must be greater than zero."
    },
    {
      "code": 6002,
      "name": "invalidMaxResponses",
      "msg": "Max responses must be greater than zero."
    },
    {
      "code": 6003,
      "name": "invalidDeadline",
      "msg": "Deadline must be in the future."
    },
    {
      "code": 6004,
      "name": "invalidCid",
      "msg": "CID cannot be empty."
    }
  ],
  "types": [
    {
      "name": "responseAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "taskBump",
            "type": "u8"
          },
          {
            "name": "responder",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "isVerified",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "cid",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "rewardVaultAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "taskBump",
            "type": "u8"
          },
          {
            "name": "balance",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "taskAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "taskId",
            "type": "u64"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "rewardPerResponse",
            "type": "u64"
          },
          {
            "name": "maxResponses",
            "type": "u16"
          },
          {
            "name": "deadline",
            "type": "i64"
          },
          {
            "name": "responsesReceived",
            "type": "u16"
          },
          {
            "name": "isComplete",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "cid",
            "type": "string"
          }
        ]
      }
    }
  ]
};
