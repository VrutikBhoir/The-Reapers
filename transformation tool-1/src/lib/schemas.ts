import type { DomainSchema, SchemaRegistry } from '../types';

export const USER_SCHEMA: DomainSchema = {
  id: 'user',
  name: 'User Data (HR/CRM)',
  fields: [
    { id: 'user_id', label: 'User ID', required: true, unique: true, type: 'String', aliases: ['id', 'userid', 'uid', 'user_no', 'customer_id'] },
    { id: 'name', label: 'Name', required: true, type: 'String', aliases: ['fullname', 'full_name', 'customer_name', 'client_name', 'first_name'] },
    { id: 'email', label: 'Email', required: true, type: 'String', aliases: ['email_address', 'e-mail', 'mail', 'emailid'] },
    { id: 'age', label: 'Age', required: false, type: 'Integer', aliases: ['years', 'age_yrs'] },
    { id: 'salary', label: 'Salary', required: false, type: 'Float', aliases: ['wage', 'income', 'compensation', 'ctc', 'amount'] },
    { id: 'join_date', label: 'Join Date', required: false, type: 'Date', aliases: ['doj', 'date_of_joining', 'joined_at', 'start_date', 'created_at'] },
    { id: 'phone', label: 'Phone', required: false, type: 'String', aliases: ['mobile', 'cell', 'contact', 'phone_no', 'tel'] },
    { id: 'is_active', label: 'Is Active', required: false, type: 'Boolean', aliases: ['active', 'status', 'enabled'] },
  ]
};

export const AUTOMOBILE_SCHEMA: DomainSchema = {
  id: 'automobile',
  name: 'Automobile Inventory',
  fields: [
    { id: 'vin', label: 'VIN', required: true, unique: true, type: 'String', aliases: ['chassis_no', 'serial_number', 'vehicle_id', 'id'] },
    { id: 'make', label: 'Make', required: true, type: 'String', aliases: ['manufacturer', 'brand', 'company'] },
    { id: 'model', label: 'Model', required: true, type: 'String', aliases: ['variant', 'car_model'] },
    { id: 'year', label: 'Year', required: true, type: 'Integer', aliases: ['mfg_year', 'model_year', 'manufacturing_year'] },
    { id: 'price', label: 'Price', required: true, type: 'Float', aliases: ['cost', 'amount', 'selling_price', 'msrp'] },
    { id: 'fuel_type', label: 'Fuel Type', required: false, type: 'String', aliases: ['fuel', 'engine_type', 'power_source'] },
    { id: 'mileage', label: 'Mileage', required: false, type: 'Integer', aliases: ['odometer', 'km_driven', 'miles'] },
    { id: 'color', label: 'Color', required: false, type: 'String', aliases: ['paint', 'shade', 'colour'] },
    { id: 'transmission', label: 'Transmission', required: false, type: 'String', aliases: ['gearbox', 'gear_type'] },
  ]
};

export const SCHEMAS: SchemaRegistry = {
  user: USER_SCHEMA,
  automobile: AUTOMOBILE_SCHEMA
};
