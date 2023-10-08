/**
 * A type representing a map of CSS properties.
 */
export type CssObject = {
  [key: string]: string | number | CssObject;
};

/**
 * Converts a given string to kebab-case. If the string starts with an uppercase letter,
 * it prepends a hyphen to the result.
 * @param str - The string to be converted.
 * @returns The kebab-case string.
 */
function caseConverter(str: string): string {
  if (str.length === 0) return str;
  const isUppercase = str[0] === str[0].toUpperCase();
  const result = str
    .split(/(?=[A-Z])/)
    .join('-')
    .toLowerCase();
  return isUppercase ? `-${result}` : result;
}

/**
 * Converts an object to a CSS string representation. This function uses an iterative
 * approach instead of recursion for better performance.
 * @param obj - The object containing CSS properties to be converted.
 * @returns The CSS string representation of the object.
 * @throws TypeError if the input is not an object or is an array.
 */
export function toCss(obj: CssObject): string {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    throw new TypeError(
      `Expected an argument of type object, but got ${typeof obj}`
    );
  }

  type StackElement = {
    parentSelector: string;
    cssObj: CssObject;
  };

  // Initialize stack with the root object.
  const stack: StackElement[] = [{ parentSelector: '', cssObj: obj }];
  const lines: string[] = [];

  while (stack.length > 0) {
    const { parentSelector, cssObj } = stack.pop() as StackElement;
    let nestedCss: string[] = [];

    for (const [id, value] of Object.entries(cssObj)) {
      const key = caseConverter(id);

      if (typeof value === 'object' && !Array.isArray(value)) {
        // Handle nested CSS by pushing it onto the stack.
        const newSelector = parentSelector
          ? `${parentSelector} .${caseConverter(id)}`
          : `.${caseConverter(id)}`;
        stack.push({ parentSelector: newSelector, cssObj: value as CssObject });
      } else {
        nestedCss.push(`${key}:${value};`);
      }
    }

    if (nestedCss.length > 0) {
      lines.push(`${parentSelector}{${nestedCss.join('')}}`);
    }
  }

  return lines.reverse().join('');
}

/**
 * Injects a raw CSS string or a CSS object into a style element and appends it
 * to a host element.
 * @param textOrObject - The CSS string or object.
 * @param id - Optional ID for the style element.
 * @param overridable - Whether an existing style element with the same ID should be overridden.
 * @param hostElement - The host element to append the style element to. Defaults to document.head.
 * @throws Error for invalid inputs or if an existing style element is not a <style> tag.
 */
export function injectStyle(
  textOrObject: string | CssObject,
  id?: string,
  overridable = true,
  hostElement: HTMLElement = document.head
) {
  if (!textOrObject || Array.isArray(textOrObject)) {
    throw new Error('Invalid input: textOrObject cannot be null or an array.');
  }

  if (typeof textOrObject === 'string' && textOrObject.length === 0) {
    throw new Error('Invalid input: CSS string cannot be empty.');
  }

  if (id) {
    const oldStyle = document.getElementById(id);
    if (oldStyle) {
      const isStyleTag = oldStyle.tagName.toLowerCase() === 'style';
      if (!isStyleTag) {
        throw new Error('The provided id does not indicate a style tag.');
      } else if (isStyleTag && !overridable) {
        console.warn(
          'Style with the same id exists and overridable is set to false. Skipping.'
        );
        return;
      }
      oldStyle.textContent =
        typeof textOrObject === 'object' ? toCss(textOrObject) : textOrObject;
      return;
    }
  }

  const style = document.createElement('style');
  style.type = 'text/css';
  style.textContent =
    typeof textOrObject === 'object' ? toCss(textOrObject) : textOrObject;
  if (id) style.id = id;
  hostElement.appendChild(style);
}