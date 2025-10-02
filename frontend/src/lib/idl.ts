/**
 * Solstice Protocol IDL
 * Generated from contracts/target/idl/contracts.json
 */

export type Contracts = {
  "address": "ELqNcvWpY4L5qAe7P4PuEKMo86zrouKctZF3KuSysuYY",
  "metadata": {
    "name": "contracts",
    "version": "0.1.0",
    "spec": "0.1.0"
  },
  "instructions": [
    {
      "name": "initialize",
      "discriminator": [175, 175, 109, 31, 13, 152, 155, 237],
      "accounts": [
        {
          "name": "registry",
          "writable": true
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "system_program"
        }
      ],
      "args": []
    },
    {
      "name": "register_identity",
      "discriminator": [137, 53, 72, 142, 84, 176, 164, 242],
      "accounts": [
        {
          "name": "identity",
          "writable": true
        },
        {
          "name": "registry",
          "writable": true
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "system_program"
        }
      ],
      "args": [
        {
          "name": "identity_commitment",
          "type": {
            "array": ["u8", 32]
          }
        },
        {
          "name": "merkle_root",
          "type": {
            "array": ["u8", 32]
          }
        }
      ]
    },
    {
      "name": "verify_identity",
      "discriminator": [82, 236, 147, 198, 191, 178, 69, 30],
      "accounts": [
        {
          "name": "identity",
          "writable": true
        },
        {
          "name": "authority",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "proof",
          "type": {
            "vec": "u8"
          }
        },
        {
          "name": "public_inputs",
          "type": {
            "vec": "u8"
          }
        },
        {
          "name": "attribute_type",
          "type": "u8"
        }
      ]
    }
  ]
};

export const IDL: Contracts = {
  "address": "ELqNcvWpY4L5qAe7P4PuEKMo86zrouKctZF3KuSysuYY",
  "metadata": {
    "name": "contracts",
    "version": "0.1.0",
    "spec": "0.1.0"
  },
  "instructions": [
    {
      "name": "initialize",
      "discriminator": [175, 175, 109, 31, 13, 152, 155, 237],
      "accounts": [
        {
          "name": "registry",
          "writable": true
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "system_program"
        }
      ],
      "args": []
    },
    {
      "name": "register_identity",
      "discriminator": [137, 53, 72, 142, 84, 176, 164, 242],
      "accounts": [
        {
          "name": "identity",
          "writable": true
        },
        {
          "name": "registry",
          "writable": true
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "system_program"
        }
      ],
      "args": [
        {
          "name": "identity_commitment",
          "type": {
            "array": ["u8", 32]
          }
        },
        {
          "name": "merkle_root",
          "type": {
            "array": ["u8", 32]
          }
        }
      ]
    },
    {
      "name": "verify_identity",
      "discriminator": [82, 236, 147, 198, 191, 178, 69, 30],
      "accounts": [
        {
          "name": "identity",
          "writable": true
        },
        {
          "name": "authority",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "proof",
          "type": {
            "vec": "u8"
          }
        },
        {
          "name": "public_inputs",
          "type": {
            "vec": "u8"
          }
        },
        {
          "name": "attribute_type",
          "type": "u8"
        }
      ]
    }
  ]
};
