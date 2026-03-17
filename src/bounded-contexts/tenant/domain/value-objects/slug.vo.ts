const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,98}[a-z0-9]$/;

export class SlugVO {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static fromString(value: string): SlugVO {
    if (!SLUG_REGEX.test(value)) {
      throw new Error(`Invalid slug: ${value}`);
    }
    return new SlugVO(value);
  }

  static fromName(name: string): SlugVO {
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');

    const bounded = slug.substring(0, 100);

    if (bounded.length < 3) {
      throw new Error(`Cannot generate a valid slug from name: ${name}`);
    }

    return new SlugVO(bounded);
  }

  equals(other: SlugVO): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
