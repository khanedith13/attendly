const whole = (value, min, max) => {
    const number = Number(value);
    return String(value).trim() !== "" && Number.isInteger(number) && number >= min && number <= max;
  };
  
  export function validateSettings(values) {
    const errors = {};
  
    const name = String(values.platformName).trim();
    if (!name) errors.platformName = "Platform name is required.";
    else if (name.length > 50) errors.platformName = "Use 50 characters or fewer.";
  
    const domain = String(values.schoolDomain).trim().toLowerCase();
    if (!domain) errors.schoolDomain = "School domain is required.";
    else if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain)) {
      errors.schoolDomain = "Enter a domain like school.edu.ph (without @).";
    }
  
    if (!whole(values.lateGraceMinutes, 0, 120)) {
      errors.lateGraceMinutes = "Enter a whole number from 0 to 120.";
    }
    if (!whole(values.sessionTimeoutMinutes, 5, 480)) {
      errors.sessionTimeoutMinutes = "Enter a whole number from 5 to 480.";
    }
  
    return errors;
  }