/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/smart_contracts.json`.
 */
export type SmartContracts = {
  "address": "NDRAKc9KJzfX2ymdJQ7Ad3sr4FSdP7wixVoTVTWt7hU",
  "metadata": {
    "name": "smartContracts",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
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
          "name": "adminAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  100,
                  109,
                  105,
                  110
                ]
              }
            ]
          }
        },
        {
          "name": "adminAuthority",
          "writable": true
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
      "name": "initAdmin",
      "discriminator": [
        97,
        65,
        97,
        27,
        200,
        206,
        72,
        219
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "adminAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  100,
                  109,
                  105,
                  110
                ]
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
          "name": "adminAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  100,
                  109,
                  105,
                  110
                ]
              }
            ]
          }
        },
        {
          "name": "signer",
          "writable": true,
          "signer": true
        }
      ],
      "args": []
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
                "kind": "account",
                "path": "task_account.task_id",
                "account": "taskAccount"
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
          "writable": true
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "adminAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  100,
                  109,
                  105,
                  110
                ]
              }
            ]
          }
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
          "name": "adminAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  100,
                  109,
                  105,
                  110
                ]
              }
            ]
          }
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
      "name": "adminAccount",
      "discriminator": [
        153,
        119,
        180,
        178,
        43,
        66,
        235,
        148
      ]
    },
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
    },
    {
      "code": 6005,
      "name": "invalidCreator",
      "msg": "Invalid creator."
    },
    {
      "code": 6006,
      "name": "taskAlreadyComplete",
      "msg": "Task already marked complete."
    },
    {
      "code": 6007,
      "name": "deadlinePassed",
      "msg": "Deadline has already passed."
    },
    {
      "code": 6008,
      "name": "maxResponsesReached",
      "msg": "Max responses reached."
    },
    {
      "code": 6009,
      "name": "responseAlreadyExists",
      "msg": "Response already exists."
    },
    {
      "code": 6010,
      "name": "unauthorized",
      "msg": "unauthorized"
    },
    {
      "code": 6011,
      "name": "notEnoughResponses",
      "msg": "Not enough responses yet"
    }
  ],
  "types": [
    {
      "name": "adminAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
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
