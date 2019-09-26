# Outline
Compile multi files in project directory and output them into each directory at the same time. In addition, copy compile files to other directories if other output paths are defined with output.json in each project directory.



# How to use

### Environment variables
| parameter | type| description |
| --- | --- | ---|
| target | String | Build files on only target folders. List them with comma |
| shallowWatch| Boolean | Disable watch for your common modules which are set at resolve property on webpack.config.js |
| enableWatch | Boolean | Copy compiled files to other directories. It`s reference from output.json in the project directory. |

output.json
```
[
  {
    "dir": "directory1-name",
    "filename": "file-name"
  },
  {
    "dir": "directory2-name",
  }
]
```



### Examples
```
npm run build -- --env.target="hoge, fuga"
```

```
npm run watch -- --env.shallowWatch=true
```

```
npm run watch -- --env.target="hoge, fuga" --env.enableCopy=true
```
