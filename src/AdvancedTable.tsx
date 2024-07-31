{
  "icon": "./assets/icon.svg",
  "name": "AdvancedTable",
  "hint": "Display numerical information as a table with bar charts",
  "options": {
    "aggregation": true,
    "individualFilter": true,
    "aggregateFilter": true
  },
  "settings": [
    {
      "name": {
        "key": "Display Settings"
      },
      "settings": [
        {
          "name": {
            "key": "Title"
          },
          "key": "title",
          "type": "text",
          "hint": "Enter the title text"
        },
        {
          "name": {
            "key": "Title Color"
          },
          "key": "titleColor",
          "type": "color",
          "hint": "Select the title color"
        },
        {
          "name": {
            "key": "Value Color"
          },
          "key": "valueColor",
          "type": "color",
          "hint": "Select the value color"
        },
        {
          "name": {
            "key": "Bar Color"
          },
          "key": "barColor",
          "type": "color",
          "hint": "Select the bar color"
        },
        {
          "name": {
            "key": "Bar Height"
          },
          "key": "barHeight",
          "type": "number",
          "hint": "Select the bar height (px)",
          "default": 20
        },
        {
          "name": {
            "key": "Bar Rounding"
          },
          "key": "barRounding",
          "type": "number",
          "hint": "Select the bar rounding (px)",
          "default": 30
        },
        {
          "name": {
            "key": "Table Border Color"
          },
          "key": "tableBorderColor",
          "type": "color",
          "hint": "Select the table border color",
          "default": "#A9A9A9"
        },
        {
          "name": {
            "key": "Alternating Row Colors"
          },
          "key": "alternatingRowColors",
          "type": "boolean",
          "hint": "Enable alternating row colors"
        }
      ]
    }
  ],
  "bindingsTrays": [
    {
      "key": "tray-key-dim",
      "name": {
        "key": "BreakBy"
      },
      "queryRole": "row",
      "minCount": 1,
      "maxCount": 1
    },
    {
      "key": "tray-key",
      "name": {
        "key": "measures"
      },
      "queryRole": "measure",
      "settings": [
        {
          "name": "Number Format",
          "settings": [
            {
              "name": "Scale",
              "key": "scale1",
              "type": "scale"
            },
            {
              "name": "Format",
              "key": "format",
              "type": "number-format",
              "defaultValue": "###,###"
            },
            {
              "name": "Color",
              "key": "color",
              "type": "color"
            },
            {
              "name": "Transparency",
              "key": "transparency",
              "type": "number",
              "defaultValue": 70
            }
          ]
        }
      ],
      "minCount": 1,
      "maxCount": 5
    }
  ]
}
