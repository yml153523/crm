export const validators = {
  phone: (value: string): boolean => {
    return /^1[3-9]\d{9}$/.test(value)
  },
  
  password: (value: string): boolean => {
    return value.length >= 6
  },
  
  required: (value: string): boolean => {
    return value !== undefined && value !== null && value !== ''
  },
  
  email: (value: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  }
}

export function validateForm(rules: Record<string, Function>, data: Record<string, any>): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  for (const [key, validator] of Object.entries(rules)) {
    if (!validator(data[key])) {
      errors.push(`${key} 验证失败`)
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}
