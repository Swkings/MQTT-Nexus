
export type Language = 'go' | 'python' | 'cpp' | 'java' | 'typescript';

function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase())
    .replace(/^(.)/, (m, chr) => chr.toUpperCase());
}

function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
}

function getTypeName(val: any): string {
  if (val === null) return 'any';
  if (Array.isArray(val)) return 'array';
  return typeof val;
}

export function generateCode(json: any, lang: Language, rootName: string = 'Message'): string {
  switch (lang) {
    case 'go':
      return generateGo(json, rootName);
    case 'python':
      return generatePython(json, rootName);
    case 'cpp':
      return generateCpp(json, rootName);
    case 'java':
      return generateJava(json, rootName);
    case 'typescript':
      return generateTypeScript(json, rootName);
    default:
      return '';
  }
}

function generateGo(json: any, name: string): string {
  let structs: string[] = [];
  
  function build(obj: any, structName: string): string {
    if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
      return goType(obj);
    }

    let fields = [];
    for (const [key, val] of Object.entries(obj)) {
      const pascalKey = toPascalCase(key);
      let typeStr = '';
      if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
        const subName = structName + pascalKey;
        typeStr = subName;
        build(val, subName);
      } else if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
        const subName = structName + pascalKey + 'Item';
        typeStr = `[]${subName}`;
        build(val[0], subName);
      } else {
        typeStr = goType(val);
      }
      fields.push(`\t${pascalKey} ${typeStr} \`json:"${key}"\``);
    }
    
    structs.push(`type ${structName} struct {\n${fields.join('\n')}\n}`);
    return structName;
  }

  function goType(val: any): string {
    if (val === null) return 'interface{}';
    if (Array.isArray(val)) {
      if (val.length === 0) return '[]interface{}';
      return `[]${goType(val[0])}`;
    }
    switch (typeof val) {
      case 'number': return Number.isInteger(val) ? 'int64' : 'float64';
      case 'string': return 'string';
      case 'boolean': return 'bool';
      default: return 'interface{}';
    }
  }

  build(json, toPascalCase(name));
  return structs.reverse().join('\n\n');
}

function generatePython(json: any, name: string): string {
  let classes: string[] = [];
  
  function build(obj: any, className: string): string {
    if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
      return pyType(obj);
    }

    let fields = [];
    for (const [key, val] of Object.entries(obj)) {
      let typeStr = '';
      if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
        const subName = className + toPascalCase(key);
        typeStr = subName;
        build(val, subName);
      } else if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
        const subName = className + toPascalCase(key) + 'Item';
        typeStr = `List[${subName}]`;
        build(val[0], subName);
      } else {
        typeStr = pyType(val);
      }
      fields.push(`    ${key}: ${typeStr}`);
    }
    
    classes.push(`@dataclass\nclass ${className}:\n${fields.join('\n') || '    pass'}`);
    return className;
  }

  function pyType(val: any): string {
    if (val === null) return 'Any';
    if (Array.isArray(val)) {
      if (val.length === 0) return 'List[Any]';
      return `List[${pyType(val[0])}]`;
    }
    switch (typeof val) {
      case 'number': return Number.isInteger(val) ? 'int' : 'float';
      case 'string': return 'str';
      case 'boolean': return 'bool';
      default: return 'Any';
    }
  }

  classes.push('from dataclasses import dataclass\nfrom typing import List, Any\n');
  build(json, toPascalCase(name));
  return classes.join('\n\n');
}

function generateTypeScript(json: any, name: string): string {
  let interfaces: string[] = [];
  
  function build(obj: any, interfaceName: string): string {
    if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
      return tsType(obj);
    }

    let fields = [];
    for (const [key, val] of Object.entries(obj)) {
      let typeStr = '';
      if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
        const subName = interfaceName + toPascalCase(key);
        typeStr = subName;
        build(val, subName);
      } else if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
        const subName = interfaceName + toPascalCase(key) + 'Item';
        typeStr = `${subName}[]`;
        build(val[0], subName);
      } else {
        typeStr = tsType(val);
      }
      fields.push(`  ${key}: ${typeStr};`);
    }
    
    interfaces.push(`export interface ${interfaceName} {\n${fields.join('\n')}\n}`);
    return interfaceName;
  }

  function tsType(val: any): string {
    if (val === null) return 'any';
    if (Array.isArray(val)) {
      if (val.length === 0) return 'any[]';
      return `${tsType(val[0])}[]`;
    }
    switch (typeof val) {
      case 'number': return 'number';
      case 'string': return 'string';
      case 'boolean': return 'boolean';
      default: return 'any';
    }
  }

  build(json, toPascalCase(name));
  return interfaces.reverse().join('\n\n');
}

function generateCpp(json: any, name: string): string {
  let structs: string[] = [];
  
  function build(obj: any, structName: string): string {
    if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
      return cppType(obj);
    }

    let fields = [];
    for (const [key, val] of Object.entries(obj)) {
      let typeStr = '';
      if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
        const subName = structName + toPascalCase(key);
        typeStr = subName;
        build(val, subName);
      } else if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
        const subName = structName + toPascalCase(key) + 'Item';
        typeStr = `std::vector<${subName}>`;
        build(val[0], subName);
      } else {
        typeStr = cppType(val);
      }
      fields.push(`    ${typeStr} ${key};`);
    }
    
    structs.push(`struct ${structName} {\n${fields.join('\n')}\n};`);
    return structName;
  }

  function cppType(val: any): string {
    if (val === null) return 'nlohmann::json';
    if (Array.isArray(val)) {
      if (val.length === 0) return 'std::vector<nlohmann::json>';
      return `std::vector<${cppType(val[0])}>`;
    }
    switch (typeof val) {
      case 'number': return Number.isInteger(val) ? 'int64_t' : 'double';
      case 'string': return 'std::string';
      case 'boolean': return 'bool';
      default: return 'nlohmann::json';
    }
  }

  structs.push('#include <string>\n#include <vector>\n#include <cstdint>\n#include <nlohmann/json.hpp>\n');
  build(json, toPascalCase(name));
  return structs.join('\n\n');
}

function generateJava(json: any, name: string): string {
  let classes: string[] = [];
  
  function build(obj: any, className: string): string {
    if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
      return javaType(obj);
    }

    let fields = [];
    for (const [key, val] of Object.entries(obj)) {
      let typeStr = '';
      if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
        const subName = className + toPascalCase(key);
        typeStr = subName;
        build(val, subName);
      } else if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
        const subName = className + toPascalCase(key) + 'Item';
        typeStr = `List<${subName}>`;
        build(val[0], subName);
      } else {
        typeStr = javaType(val);
      }
      fields.push(`    private ${typeStr} ${key};`);
    }
    
    classes.push(`public class ${className} {\n${fields.join('\n')}\n}`);
    return className;
  }

  function javaType(val: any): string {
    if (val === null) return 'Object';
    if (Array.isArray(val)) {
      if (val.length === 0) return 'List<Object>';
      return `List<${javaType(val[0])}>`;
    }
    switch (typeof val) {
      case 'number': return Number.isInteger(val) ? 'Long' : 'Double';
      case 'string': return 'String';
      case 'boolean': return 'Boolean';
      default: return 'Object';
    }
  }

  classes.push('import java.util.List;\n');
  build(json, toPascalCase(name));
  return classes.join('\n\n');
}
