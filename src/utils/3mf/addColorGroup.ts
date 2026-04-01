export function addColorGroup(
  xmlDoc: Document,
  colors: string[],
  colorGroupId?: string
) {
  const MATERIAL_NS = 'http://schemas.microsoft.com/3dmanufacturing/material/2015/02';
  const colorGroup = xmlDoc.createElementNS(MATERIAL_NS, 'm:colorgroup');

  colorGroupId = colorGroupId || findNextFreeId(xmlDoc).toString();
  colorGroup.setAttribute('id', colorGroupId);

  for (let i = 0; i < colors.length; i++) {
    const color = xmlDoc.createElementNS(MATERIAL_NS, 'm:color');
    color.setAttribute('color', colors[i]);
    colorGroup.appendChild(color);
  }

  let resourcesNode = xmlDoc.getElementsByTagName('resources')[0];
  if (!resourcesNode) {
    resourcesNode = xmlDoc.createElementNS('http://schemas.microsoft.com/3dmanufacturing/core/2015/02', 'resources');
    const modelNode = xmlDoc.getElementsByTagName('model')[0];
    if (modelNode) {
      modelNode.appendChild(resourcesNode);
    } else {
      xmlDoc.documentElement.appendChild(resourcesNode);
    }
  }

  resourcesNode.appendChild(colorGroup);

  return colorGroupId;
}

let maxId = 100;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function findNextFreeId(xmlDoc: Document) {
  // TODO: This is not a good way to find a free id. We should instead look through the document
  return maxId++;
}
