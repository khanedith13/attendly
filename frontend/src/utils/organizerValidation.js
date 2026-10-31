export function validateOrganizerProfile(values) {
    const errors = {};
  
    if (!values.name.trim()) errors.name = "Contact person is required.";
    else if (values.name.trim().length > 100) errors.name = "Use 100 characters or fewer.";
  
    if (!values.organizationName.trim()) errors.organizationName = "Organization name is required.";
    else if (values.organizationName.trim().length > 150) {
      errors.organizationName = "Use 150 characters or fewer.";
    }
  
    const phone = values.contactNumber.trim();
    if (phone && !/^\+?[\d\s\-()]{7,30}$/.test(phone)) {
      errors.contactNumber = "Enter a valid phone number.";
    }
  
    return errors;
  }