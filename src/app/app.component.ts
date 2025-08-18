import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormlyFieldConfig, FormlyForm, FormlyFormOptions } from '@ngx-formly/core';
import { FormlySelectModule } from '@ngx-formly/core/select';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormlyForm, ReactiveFormsModule, CommonModule, FormlySelectModule, FormsModule, DragDropModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class App implements OnInit {

  constructor(private fb: FormBuilder) {}

  // Main form
  form = new FormGroup({});
  model: any = {};
  options: FormlyFormOptions = {};
  fields: FormlyFieldConfig[] = [];
  users: any[] = [];

  uid = signal(0);
  isEdit = signal(false);

  // Modal state
  modalStep = signal<'select' | 'configure'>('select');
  modalForm = new FormGroup({});
  modalModel: any = {};
  modalOptions: FormlyFormOptions = {};
  modalFields: FormlyFieldConfig[] = [];
  savedFormNames: string[] = [];

  allFieldsModalOpen = signal(false);
  allFieldsForm = new FormGroup({});
  allFieldsModel: any = {};
  allFieldsFields: FormlyFieldConfig[] = [];

  editFormModal = new FormGroup({});
  editFormModel: any = {};
  editFormFields: FormlyFieldConfig[] = [
    {
      key: "formName",
      type: "input",
      wrappers: ["form-field-modal"],
      props: {
        uid: '1',
        label: "Form Name",
        placeholder: "Enter form name",
        class: "form-control mb-2",
        labelClass: "form-label",
        id: "formName",
        required: true
      },
      validation: {
        messages: {
          required: "This field is required"
        }
      }
    },
    {
      key: "wrapper",
      type: "radio",
      wrappers: ["form-field-modal"],
      defaultValue: () => {
        // Get saved wrapper for current form or default to horizontal
        return localStorage.getItem(`wrapper_${this.editFormModel.formName}`) || "form-field-horizontal";
      },
      props: {
        uid: '1',
        label: "Form Wrapper",
        class: "form-check-input",
        labelClass: "form-check-label",
        id: "wrapper",
        required: true,
        options: [
          { value: "form-field-horizontal", label: "Horizontal Wrapper" },
          { value: "form-field-vertical", label: "Vertical Wrapper" },
        ],
      },
      validation: {
        messages: {
          required: "This field is required"
        }
      }
    }
  ];

  displayFields: { key: string, label: string }[] = [];

  formHeading = '';
  editFormNameBefore = '';
  showForm = '';

  formChanged = false;

  openEditFormNameModal(name: string) {
    const savedWrapper = localStorage.getItem(`wrapper_${name}`) || 'form-field-horizontal';

    this.editFormModel = {
      formName: name,
      wrapper: savedWrapper
    };

    this.editFormFields = this.editFormFields.map(f => {
      if (f.key === 'wrapper') {
        return {
          ...f,
          defaultValue: savedWrapper
        };
      }
      return f;
    });

    this.editFormNameBefore = name;
  }
  
  ngOnInit() {
    // Don't load any fields until a form is opened
    this.fields = [];
    this.model = {};
    this.users = [];
    this.fetchData(); 
    this.loadSavedFormNames();
  }

  private resetFormGroup() {
    this.form = new FormGroup({});
    this.model = {};
  }

  loadSavedFormNames() {
    const savedForms = JSON.parse(localStorage.getItem('savedForms') || '{}');
    this.savedFormNames = Object.keys(savedForms);
  }

  loadSavedForm(formName: string) {
    this.formChanged = false;
    const savedForms = JSON.parse(localStorage.getItem('savedForms') || '{}');
    
    if (savedForms[formName]) {
      this.showForm = formName;
      this.fields = savedForms[formName].map((f: any) => ({
        ...f,
        wrappers: [localStorage.getItem(`wrapper_${formName}`) || 'form-field-horizontal']
      }));
      this.reattachFieldFunctions();
      this.formHeading = formName;

      // 🔹 Reset form group so new fields attach properly
      this.form = new FormGroup({});
      this.model = {};

      localStorage.setItem('formFields', JSON.stringify(this.fields));
      this.fetchData();
    }
  }

  createNewForm() {
    let savedForms = JSON.parse(localStorage.getItem('savedForms') || '{}');
    let counter = 1;
    let newFormName = `Form${counter}`;
    while (savedForms[newFormName]) {
      counter++;
      newFormName = `Form${counter}`;
    }

    this.formHeading = newFormName;
    this.showForm = newFormName;
    this.fields = [];
    this.users = [];

    // 🔹 Reset form group here too
    this.form = new FormGroup({});
    this.model = {};

    savedForms[newFormName] = [];
    localStorage.setItem('savedForms', JSON.stringify(savedForms));

    let savedEntries = JSON.parse(localStorage.getItem('savedFormEntries') || '{}');
    savedEntries[newFormName] = [];
    localStorage.setItem('savedFormEntries', JSON.stringify(savedEntries));

    this.loadSavedFormNames();
    this.fetchData();
    this.showNotification("Form created successfully!");
  }
  saveForm() {
    const savedForms = JSON.parse(localStorage.getItem('savedForms') || '{}');
    savedForms[this.formHeading] = this.fields;
    localStorage.setItem('savedForms', JSON.stringify(savedForms));

    this.formChanged = false;
    this.loadSavedFormNames(); // Refresh sidebar list
    this.showNotification("Form saved successfully!");
  }

  formNameChange(newWrapper: string) {
    if (!this.formHeading) return; // no active form

    // 🔹 Update wrapper for all fields in this form
    this.fields = this.fields.map(f => ({
      ...f,
      wrappers: [newWrapper]
    }));

    // 🔹 Persist in localStorage
    const savedForms = JSON.parse(localStorage.getItem('savedForms') || '{}');
    if (savedForms[this.formHeading]) {
      savedForms[this.formHeading] = this.fields;
      localStorage.setItem('savedForms', JSON.stringify(savedForms));
    }

    // 🔹 Keep current wrapper for new fields
    localStorage.setItem(`wrapper_${this.formHeading}`, newWrapper);

  }

  saveFormNameChange() {
    if (!this.editFormModel.formName) {
      alert("Form name is empty!");
    } else {
      const oldName = this.editFormNameBefore || '';
      const newName = this.editFormModel.formName.trim();
      const newWrapper = this.editFormModel.wrapper || 'form-field-horizontal';

      const savedForms = JSON.parse(localStorage.getItem('savedForms') || '{}');
      const savedEntries = JSON.parse(localStorage.getItem('savedFormEntries') || '{}');

      // Prevent duplicate names
      if (savedForms[newName] && newName !== oldName) {
        alert("A form with this name already exists!");
      } else {
        // 🔹 Update wrapper for all fields
        this.formNameChange(newWrapper);

        // 🔹 Rename form and entries if name changed
        if (oldName && newName && oldName !== newName) {
          savedForms[newName] = savedForms[oldName];
          delete savedForms[oldName];

          savedEntries[newName] = savedEntries[oldName] || [];
          delete savedEntries[oldName];

          // 🔹 Rename wrapper key in localStorage
          const oldWrapper = localStorage.getItem(`wrapper_${oldName}`) || 'form-field-horizontal';
          localStorage.setItem(`wrapper_${newName}`, oldWrapper);
          localStorage.removeItem(`wrapper_${oldName}`);

          if (this.formHeading === oldName) this.formHeading = newName;
          if (this.showForm === oldName) this.showForm = newName;
        }

        localStorage.setItem('savedForms', JSON.stringify(savedForms));
        localStorage.setItem('savedFormEntries', JSON.stringify(savedEntries));

        this.loadSavedFormNames();
        this.showNotification('Successfully updated form info!');
      }
    }
  }

  deleteFormName() {
    const formName = this.editFormModel.formName?.trim();
    if (!formName) {
      alert("Form name is missing!");
    } else {
      const savedForms = JSON.parse(localStorage.getItem('savedForms') || '{}');
      const savedEntries = JSON.parse(localStorage.getItem('savedFormEntries') || '{}');

      if (savedForms[formName]) {
        delete savedForms[formName];
      }
      if (savedEntries[formName]) {
        delete savedEntries[formName];
      }

      // Remove wrapper from localStorage
      localStorage.removeItem(`wrapper_${formName}`);
      localStorage.removeItem('formFields');

      localStorage.setItem('savedForms', JSON.stringify(savedForms));
      localStorage.setItem('savedFormEntries', JSON.stringify(savedEntries));

      // If currently viewing the deleted form, clear UI
      if (this.formHeading === formName) {
        this.formHeading = '';
        this.fields = [];
        this.users = [];
        this.model = {};
      }

      if (formName === this.showForm) {
        this.showForm = '';
      }

      this.loadSavedFormNames();
      this.showNotification('Form deleted successfully!');
    }
  }

  fetchData() {
    const entries = JSON.parse(localStorage.getItem('savedFormEntries') || '{}');
    let formEntries = entries[this.formHeading] || [];

    // ✅ Filter empty id-only entries
    formEntries = formEntries.filter((e: {}) => {
      const keys = Object.keys(e);
      return !(keys.length === 1 && keys.includes('id'));
    });

    entries[this.formHeading] = formEntries;
    localStorage.setItem('savedFormEntries', JSON.stringify(entries));

    this.users = formEntries;

    // 🔹 Merge keys from fields and users
    const fieldKeysFromForm = this.fields.map(f => ({
      key: f.key as string,
      label: f.props?.label || f.key as string
    }));

    const fieldKeysFromUsers: { key: string, label: string }[] = [];
    formEntries.forEach((entry: {}) => {
      Object.keys(entry).forEach(k => {
        if (k !== 'id' && !fieldKeysFromForm.some(f => f.key === k) && !fieldKeysFromUsers.some(f => f.key === k)) {
          fieldKeysFromUsers.push({ key: k, label: k }); // Use key as label if deleted
        }
      });
    });

    this.displayFields = [...fieldKeysFromForm, ...fieldKeysFromUsers];
  }

  onSubmit(model: any) {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
    } else if (this.formChanged) {
      alert("Please save the form before submitting data!");
    } else {
      if (this.fields.length > 0) {
        // Load all saved entries
        const allEntries = JSON.parse(localStorage.getItem('savedFormEntries') || '{}');
        const formEntries = allEntries[this.formHeading] || [];

        // Keep all keys from model (no filtering by fields)
        const newEntry = { id: Date.now(), ...model };

        // Save new entry
        formEntries.push(newEntry);
        allEntries[this.formHeading] = formEntries;

        localStorage.setItem('savedFormEntries', JSON.stringify(allEntries));

        // Reset
        this.model = {};
        this.form.reset();
        this.fetchData();
        this.isEdit.set(false);
        this.resetFormGroup();
      }

      this.showNotification('Successfully submitted!');
    }
  }

  update(model: any) {
    if (this.formChanged) {
      alert("Please save the form before submitting data!");
    } else {
      const allEntries = JSON.parse(localStorage.getItem('savedFormEntries') || '{}');
      const formEntries = allEntries[this.formHeading] || [];

      const updatedEntries = formEntries.map((entry: any) =>
        entry.id === this.uid() ? { id: this.uid(), ...model } : entry
      );

      allEntries[this.formHeading] = updatedEntries;
      localStorage.setItem('savedFormEntries', JSON.stringify(allEntries));

      this.model = {};
      this.fetchData();
      this.isEdit.set(false);
      this.resetFormGroup();
      this.showNotification('Successfully updated info!');
    }
  }

  deleteUser(id: any) {
    const allEntries = JSON.parse(localStorage.getItem('savedFormEntries') || '{}');
    const formEntries = allEntries[this.formHeading] || [];

    const updatedEntries = formEntries.filter((entry: any) => entry.id !== id);
    allEntries[this.formHeading] = updatedEntries;

    localStorage.setItem('savedFormEntries', JSON.stringify(allEntries));
    this.fetchData();
    this.showNotification('Successfully deleted info!');
  }

  editUser(id: number) {
    const allEntries = JSON.parse(localStorage.getItem('savedFormEntries') || '{}');
    const formEntries = allEntries[this.formHeading] || [];
    const userToEdit = formEntries.find((entry: any) => entry.id === id);

    if (userToEdit) {
      this.model = { ...userToEdit };
      this.uid.set(id);
      this.isEdit.set(true);
    }
  }

  cancel() {
    this.isEdit.set(false);
    this.model = {};
    this.form.reset();
    this.fetchData();
  }

  cancelFieldModal() {
    // Reset modal state to show field list again
    this.modalStep.set('select');
    this.modalForm.reset();
    this.modalModel = {};
    this.modalFields = [];
    this.editingFieldIndex = null;
  }

  reattachFieldFunctions() {
    this.fields = this.fields.map((field, index) => ({
      ...field,
      props: {
        ...field.props,
        index, // ✅ always reassign fresh index
        openEditFieldModal: () => this.openEditFieldModal(index),
        deleteField: () => this.deleteField(index),
        loadSavedForm: () => this.loadSavedForm(this.formHeading),
        openEditFormNameModal: () => this.openEditFormNameModal(this.formHeading),
        deleteFormName: () => this.deleteFormName(),
      }
    }));
  }

  addFixedField(type: 'input' | 'textarea' | 'select' | 'radio') {
    const baseStyle = {
      borderRadius:'', color:'', backgroundColor:'', fontFamily:'', fontSize:'', fontWeight:''
    };
    const labelBaseStyle = {
      backgroundColor:'', color:'', fontFamily:'', fontSize:'', fontWeight:'', fontStyle:''
    };
    const existingIndexes = this.fields
    .filter(f => typeof f.key === 'string' && f.key.startsWith(type))
    .map(f => parseInt((f.key as string).replace(type, ''), 10))
    .filter(num => !isNaN(num))
    .sort((a, b) => a - b);
    let index = 1;
    for (const num of existingIndexes) {
      if (num === index) {
        index++;
      } else {
        break;
      }
    }
    const currentWrapper = localStorage.getItem(`wrapper_${this.formHeading}`) || 'form-field-horizontal';

    const newField: FormlyFieldConfig = {
      key: `${type}${index}`,
      type,
      wrappers: [currentWrapper],
      props: {
        label: `${type}${index}`,
        id: `${type}${index}`,
        placeholder: type === 'textarea' ? `Enter ${type}${index} text` : `${type}${index}`,
        class: type === 'select' ? 'form-select' :
              type === 'radio' ? 'form-check-input' : 'form-control',
        required: true,
        labelClass: type === 'radio' ? 'form-check-label' : 'form-label',
        labelFor: `${type}${index}`,
        style: baseStyle, // your default style
        labelStyle: labelBaseStyle,
        index: this.fields.length, // <-- Save current index
      },
      validation: {
        messages: { required: "This field is required!" }
      }
    };

    if (type === 'select' || type === 'radio') {
      newField.props!.options = [
        { label: 'Option 1', value: 'Option 1' },
        { label: 'Option 2', value: 'Option 2' }
      ];
    }

    this.fields = [...this.fields, newField];

    // Update all indexes after addition
    this.fields.forEach((f, i) => f.props!['index'] = i);
    this.reattachFieldFunctions(); // 🔹 Make sure new one gets functions

    this.formChanged = true;
    this.cancelFieldModal();
    this.showNotification('Field added successfully!');
  }

  type = signal('');

  getValue(user: any, key: any) {
    if (!key) return '';
    return user[key] ?? '';
  }

  editingFieldIndex: number | null = null;

  openEditFieldModal(index: number) {
    this.editingFieldIndex = index;
    const field = this.fields[index];
    const type = typeof field.type === 'string' ? field.type : 'input';
    this.type.set(type);

    this.modalStep.set('configure');

    const style = field.props?.['style'] || {};
    const labelStyle = field.props?.['labelStyle'] || {};

    this.modalModel = {
      key: field.key,
      label: field.props?.label || '',
      id: field.props?.['id'] || '',
      class: field.props?.['class'] || '',
      labelClass: field.props?.['labelClass'] || '',
      placeholder: field.props?.placeholder || '',
      required: !!field.props?.required,
      options: Array.isArray(field.props?.options)
        ? field.props.options.map((o: any) => o.label).join(', ')
        : '',
      ...style,
      ...labelStyle
    };

    // Start fields array
    this.modalFields = [
      {
        fieldGroupClassName: 'row',
        fieldGroup: [
          { key: 'key', type: 'input', className: 'col-md-6', props: { label: 'Key', required: true } },
          { key: 'id', type: 'input', className: 'col-md-6', props: { label: 'ID' } },
          { key: 'label', type: 'input', className: 'col-md-6', props: { label: 'Label', required: true } },
          { key: 'placeholder', type: 'input', className: 'col-md-6', props: { label: 'Placeholder' } },
          { key: 'class', type: 'input', className: 'col-md-6', props: { label: 'Class' } },
          { key: 'labelClass', type: 'input', className: 'col-md-6', props: { label: 'Label Class' } },
          { key: 'required', type: 'checkbox', className: 'col-md-6', props: { label: 'Required' } },
        ]
      }
    ];

    if (type === 'select' || type === 'radio') {
      this.modalFields[0].fieldGroup?.push({
        key: 'options',
        type: 'input',
        className: 'col-md-6',
        props: { label: 'Options (comma separated)', required: true }
      });
    }

    // 🔹 Add a heading for Input Style
    this.modalFields.push({
      template: '<h4 class="mt-3 mb-2">Input Style</h4>'
    });
    this.modalFields.push({
      fieldGroupClassName: 'row',
      fieldGroup: Object.keys(style).map(sk => ({
        key: sk,
        type: 'input',
        className: 'col-md-6',
        props: { label: sk }
      }))
    });

    // 🔹 Add a heading for Label Style
    this.modalFields.push({
      template: '<h4 class="mt-3 mb-2">Label Style</h4>'
    });
    this.modalFields.push({
      fieldGroupClassName: 'row',
      fieldGroup: Object.keys(labelStyle).map(sk => ({
        key: sk,
        type: 'input',
        className: 'col-md-6',
        props: { label: sk }
      }))
    });

    this.modalForm = this.fb.group({});
  }

  saveFieldEdit() {
    if (this.editingFieldIndex === null) return;

    if (this.modalForm.invalid) {
      this.modalForm.markAllAsTouched();
    } else {
      const updatedStyle: any = {};
      const updatedLabelStyle: any = {};

      // Collect style values
      const styleKeys = Object.keys(this.fields[this.editingFieldIndex]?.props?.['style'] || {});
      styleKeys.forEach(sk => {
        updatedStyle[sk] = this.modalModel[sk] || '';
      });

      // Collect labelStyle values
      const labelStyleKeys = Object.keys(this.fields[this.editingFieldIndex]?.props?.['labelStyle'] || {});
      labelStyleKeys.forEach(sk => {
        updatedLabelStyle[sk] = this.modalModel[sk] || '';
      });

      const updatedField: FormlyFieldConfig = {
        ...this.fields[this.editingFieldIndex],
        key: this.modalModel.key,
        props: {
          ...this.fields[this.editingFieldIndex].props,
          label: this.modalModel.label,
          class: this.modalModel.class,
          labelClass: this.modalModel.labelClass,
          placeholder: this.modalModel.placeholder,
          required: !!this.modalModel.required,
          index: this.editingFieldIndex, // <-- Save index
          options: this.modalModel.options
            ? this.modalModel.options.split(',').map((opt: string) => ({
                label: opt.trim(),
                value: opt.trim()
              }))
            : undefined,
          style: updatedStyle,
          labelStyle: updatedLabelStyle
        }
      };

      // ✅ Replace the field in a new array to trigger change detection
      const newFields = [...this.fields];
      newFields[this.editingFieldIndex] = updatedField;
      this.fields = newFields;

      this.resetFormGroup();

      // ✅ Save in localStorage
      let savedForms = JSON.parse(localStorage.getItem('savedForms') || '{}');
      savedForms[this.formHeading] = this.fields;
      localStorage.setItem('savedForms', JSON.stringify(savedForms));

      this.modalStep.set('select');
      this.editingFieldIndex = null;
      this.modalForm.reset();
      this.modalModel = {};
      this.showNotification('Field successfully updated!');
    }
  }

  deleteField(index: number) {
    if (index >= 0 && index < this.fields.length) {
      const fieldKey = this.fields[index].key as string;

      // 🔹 Remove the field from fields array
      this.fields = this.fields.filter((_, i) => i !== index);

      // 🔹 Remove the control from the form
      if (fieldKey && this.form.contains(fieldKey)) {
        this.form.removeControl(fieldKey);
      }

      // Reassign index to all fields
      this.fields.forEach((f, i) => f.props!['index'] = i);
      this.reattachFieldFunctions();

      // Update localStorage
      localStorage.setItem('formFields', JSON.stringify(this.fields));

      this.fetchData();
      this.loadSavedFormNames();
      this.formChanged = true;
    }
    this.showNotification('Field successfully deleted!');
  }

  closeForm() {
    this.fields = [];
    this.model = {};
    this.users = [];
    this.formHeading = '';
    this.showForm = '';
    this.formChanged = false;
    this.form.reset();
    this.isEdit.set(false);
  }

  menuVisible = false;
  formMenuVisible = false;
  editMenuVisible = false;
  menuPosition = { x: 0, y: 0 };

  @HostListener('document:click')
  hideMenu() {
    this.menuVisible = false;
    this.formMenuVisible = false;
    this.editMenuVisible = false;
  }

  showContextMenu(event: MouseEvent, formName: string) {
    event.preventDefault();
    this.menuPosition = { x: event.clientX, y: event.clientY };
    this.selectedContextFormName = formName; // Store which form was right-clicked
    this.menuVisible = true;
  }

  selectedContextFormName = '';

  showFormContextMenu(event: MouseEvent) {
    event.preventDefault();
    this.menuPosition = { x: event.clientX, y: event.clientY };
    this.formMenuVisible = true;
  }

  selectedFieldIndex: number | null = null; 

  editContextMenu(event: MouseEvent, index: number) {
    event.preventDefault(); // Stop default browser menu
    this.selectedFieldIndex = index; // Store the clicked field index
    this.menuPosition = { x: event.clientX, y: event.clientY }; // Position menu at cursor
    this.editMenuVisible = true; // Show the field edit menu
  }

  onMenuClick(action: 'deleteFormName' | 'openEditFormNameModal' | 'loadSavedForm' |'openEditFieldModal' | 'deleteField') {
    if (action === 'openEditFormNameModal') {
      this.openEditFormNameModal(this.selectedContextFormName);
    } else if (action === 'deleteFormName') {
      this.editFormModel.formName = this.selectedContextFormName;
      this.deleteFormName();
    } else if (action === 'loadSavedForm') {
      this.loadSavedForm(this.selectedContextFormName);
    } else if (action === 'openEditFieldModal') {
      this.openEditFieldModal(this.selectedFieldIndex!);
    } else if (action === 'deleteField') {
      this.deleteField(this.selectedFieldIndex!);
    }
    this.editMenuVisible = false;
    this.selectedFieldIndex = null;
    this.menuVisible = false;
  }

  drop(event: CdkDragDrop<FormlyFieldConfig[]>) {
    // 1. Reorder fields array
    moveItemInArray(this.fields, event.previousIndex, event.currentIndex);

    // 2. Reassign index property for each field
    this.fields.forEach((f, i) => f.props!['index'] = i);

    // 3. Reattach field functions (so Edit/Delete still work correctly after reorder)
    this.reattachFieldFunctions();

    // 4. Mark as changed so user can save
    this.formChanged = true;
  }

  showNotification(message: string | null) {
    const popup = document.getElementById('notification');
    if (!popup) return; // Exit if not found

    popup.textContent = message ?? '';
    popup.classList.remove('hidden');
    popup.classList.add('show');

    setTimeout(() => {
      popup.classList.remove('show');
      setTimeout(() => popup.classList.add('hidden'), 100);
    }, 1000);
  }

  onDragStart() {
    // set body cursor immediately (beats CSS scope issues)
    document.body.style.cursor = 'grabbing';

    // sometimes the preview element appears a tick later — set it too
    setTimeout(() => {
      const preview = document.querySelector('.cdk-drag-preview') as HTMLElement | null;
      if (preview) preview.style.cursor = 'grabbing';
      const overlays = document.querySelectorAll('.cdk-overlay-container, .cdk-global-overlay-wrapper');
      overlays.forEach(o => (o as HTMLElement).style.cursor = 'grabbing');
    }, 0);
  }

  onDragEnd() {
    // reset
    document.body.style.cursor = '';
    const preview = document.querySelector('.cdk-drag-preview') as HTMLElement | null;
    if (preview) preview.style.cursor = '';
    const overlays = document.querySelectorAll('.cdk-overlay-container, .cdk-global-overlay-wrapper');
    overlays.forEach(o => (o as HTMLElement).style.cursor = '');
  }

  toggleAllFieldsModal() {
    if (!this.allFieldsModalOpen()) {
      this.allFieldsModel = {};

      this.allFieldsFields = this.fields.map((f, i) => {
        // preload all values into allFieldsModel
        this.allFieldsModel[`key_${i}`] = f.key;
        this.allFieldsModel[`label_${i}`] = f.props?.label;
        this.allFieldsModel[`placeholder_${i}`] = f.props?.placeholder;
        this.allFieldsModel[`class_${i}`] = f.props?.['class'];
        this.allFieldsModel[`required_${i}`] = f.props?.required;

        if (f.type === 'select' || f.type === 'radio') {
          const opts = Array.isArray(f.props?.options)
            ? f.props?.options
            : []; // ignore if it's an Observable

          this.allFieldsModel[`options_${i}`] = opts
            .map((opt: any) => opt.label || opt)
            .join(',');
        }

        return {
          fieldGroupClassName: 'row mb-3',
          fieldGroup: [
            {
              key: `key_${i}`,
              type: 'input',
              className: 'col-md-3',
              props: { label: `${f.key} Key` }
            },
            {
              key: `label_${i}`,
              type: 'input',
              className: 'col-md-3',
              props: { label: `${f.key} Label` }
            },
            // Conditional placeholder/options
            f.type === 'select' || f.type === 'radio'
              ? {
                  key: `options_${i}`,
                  type: 'input',
                  className: 'col-md-3',
                  props: {
                    label: `${f.key} Options`
                  }
                }
              : {
                  key: `placeholder_${i}`,
                  type: 'input',
                  className: 'col-md-3',
                  props: { label: `${f.key} Placeholder` }
                },
            {
              key: `class_${i}`,
              type: 'input',
              className: 'col-md-3',
              props: { label: `${f.key} Class` }
            },
            {
              key: `required_${i}`,
              type: 'checkbox',
              className: 'col-md-3',
              props: { label: `Required` }
            }
          ]
        };
      });

      this.allFieldsForm = this.fb.group({});
      this.allFieldsModalOpen.set(true);
    } else {
      this.allFieldsModalOpen.set(false);
    }
  }

  saveAllFieldsEdit() {
    this.fields = this.fields.map((f, i) => {
      // update base props
      const updatedProps: any = {
        ...f.props,
        label: this.allFieldsModel[`label_${i}`] ?? f.props?.label,
        class: this.allFieldsModel[`class_${i}`] ?? f.props?.['class'],
        required: this.allFieldsModel[`required_${i}`] ?? f.props?.required,
      };

      if (f.type === 'select' || f.type === 'radio') {
        const optionsStr = this.allFieldsModel[`options_${i}`];
        const opts = Array.isArray(f.props?.options) ? f.props?.options : [];

        updatedProps.options = optionsStr
          ? optionsStr.split(',').map((opt: string) => ({
              label: opt.trim(),
              value: opt.trim(),
            }))
          : opts;
      } else {
        // normal placeholder
        updatedProps.placeholder =
          this.allFieldsModel[`placeholder_${i}`] ?? f.props?.placeholder;
      }

      return {
        ...f,
        key: this.allFieldsModel[`key_${i}`] ?? f.key,
        props: updatedProps
      };
    });

    this.resetFormGroup();

    const savedForms = JSON.parse(localStorage.getItem('savedForms') || '{}');
    savedForms[this.formHeading] = this.fields;
    localStorage.setItem('savedForms', JSON.stringify(savedForms));

    this.allFieldsModalOpen.set(false);
    this.showNotification("All fields updated successfully!");
  }
}