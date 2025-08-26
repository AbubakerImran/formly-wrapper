import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormlyFieldConfig, FormlyForm, FormlyFormOptions } from '@ngx-formly/core';
import { FormlySelectModule } from '@ngx-formly/core/select';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { TooltipDirective } from './tooltip-component/tooltip.directive';
import { FormService } from './form.service';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormlyForm, ReactiveFormsModule, CommonModule, FormlySelectModule, FormsModule, DragDropModule, TooltipDirective, HttpClientModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class App implements OnInit {

  constructor(private fb: FormBuilder, private formService: FormService, private http: HttpClient) {}

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

  globalFieldsModalOpen = signal(false);
  globalFieldsForm = new FormGroup({});
  globalFieldsModel: any = {};
  globalFieldsFields: FormlyFieldConfig[] = [];

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
        return this.fields?.[0]?.fieldGroup?.[0]?.wrappers?.[0] ?? 'form-field-horizontal';

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
    // Fetch the form from backend
    this.http.get<any>(`http://localhost:3000/forms/${name}`).subscribe({
      next: (form) => {
        if (!form) return;

        // ✅ Get wrapper from the first field if exists
        const savedWrapper = form.fields?.[0]?.fieldGroup?.[0]?.wrappers?.[0] ?? 'form-field-horizontal';

        this.editFormModel = {
          formName: name,
          wrapper: savedWrapper
        };

        // Update the editFormFields defaultValue for the wrapper field
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
      },
      error: (err) => {
        console.error("❌ Failed to load form for editing:", err);
        this.showNotification("Failed to load form data!");
      }
    });
  }
  
  ngOnInit() {
    // Don't load any fields until a form is opened
    this.fields = [];
    this.model = {};
    this.users = [];
    this.loadSavedFormNames();
  }

  private resetFormGroup() {
    this.form = new FormGroup({});
    this.model = {};
  }

  loadSavedFormNames() {
    this.http.get<any[]>(`http://localhost:3000/forms`)
      .subscribe({
        next: (forms) => {
          this.savedFormNames = forms.map(f => f.name);
        },
        error: (err) => {
          console.error('❌ Failed to load forms:', err);
          this.savedFormNames = [];
        }
      });
  }

  loadSavedForm(formName: string) {
    this.formChanged = false;

    this.http.get<any>(`http://localhost:3000/forms/${formName}`).subscribe({
      next: (form) => {
        if (form) {
          this.showForm = formName;

          // ✅ Use wrappers from backend instead of localStorage
          this.fields = form.fields.map((row: any) => ({
            ...row,
            fieldGroup: row.fieldGroup?.map((field: any) => ({
              ...field,
              wrappers: field.wrappers?.length ? field.wrappers : ['form-field-horizontal']
            }))
          }));

          this.formHeading = formName;

          // Reattach edit/delete functions
          this.reattachFieldFunctions();

          // ✅ Rebuild FormGroup controls for reactive form
          this.form = new FormGroup({});
          this.fields.forEach(row => {
            row.fieldGroup?.forEach(field => {
              const key = field.key as string;
              this.form.addControl(
                key,
                this.fb.control(
                  this.model[key] ?? '',
                  field.props?.required ? Validators.required : null
                )
              );
            });
          });

          this.fetchData();
        }
      },
      error: (err) => {
        console.error("❌ Failed to load form:", err);
      }
    });
  }

  createNewForm() {
    let counter = 1;
    let newFormName = `Form${counter}`;

    // 🔹 First fetch all saved forms from backend to check name collisions
    this.http.get<any[]>(`http://localhost:3000/forms`).subscribe({
      next: (forms) => {
        const existingNames = forms.map(f => f.name);
        while (existingNames.includes(newFormName)) {
          counter++;
          newFormName = `Form${counter}`;
        }

        // 🔹 Call backend to actually create the form
        this.http.post<any>(`http://localhost:3000/forms`, { name: newFormName, fields: [] })
          .subscribe({
            next: (createdForm) => {
              this.formHeading = createdForm.name;
              this.showForm = createdForm.name;
              this.fields = [];
              this.users = [];
              this.form = new FormGroup({});
              this.model = {};

              this.loadSavedFormNames(); // now fetch from backend
              this.fetchData();          // fetch entries for new form
              this.showNotification("Form created successfully!");
            },
            error: (err) => {
              console.error("❌ Failed to create form:", err);
            }
          });
      },
      error: (err) => {
        console.error("❌ Failed to load forms:", err);
      }
    });
  }

  saveForm() {
    // form schema
    const formPayload = {
      name: this.formHeading,
      fields: this.fields,
    };

    this.http.post('http://localhost:3000/forms', formPayload).subscribe({
      next: () => {
        this.formChanged = false;
        this.loadSavedFormNames();
        this.showNotification("Form saved successfully!");

        this.loadSavedForm(this.formHeading);
      },
      error: (err) => {
        console.error("❌ Failed to save form:", err);
        this.showNotification("Failed to save form!");
      }
    });
  }

  saveFormNameChange() {

    if(this.formChanged) {
      if(!confirm("Are you sure to update the form info? changes will be lost!"))
      return
    }

    if (!this.editFormModel.formName) {
      alert("Form name is empty!");
      return;
    }

    const oldName = this.editFormNameBefore || '';
    const newName = this.editFormModel.formName.trim();
    const newWrapper = this.editFormModel.wrapper || 'form-field-horizontal';

    // Prevent duplicate
    if (this.savedFormNames.includes(newName) && newName !== oldName) {
      alert("A form with this name already exists!");
      return;
    }

    this.http.put(`http://localhost:3000/forms/rename/${oldName}`, {
      newName,
      wrapper: newWrapper
    }).subscribe({
      next: () => {
        // refresh UI AFTER backend update
        this.formHeading = newName;
        this.showForm = newName;
        this.loadSavedFormNames();
        this.showNotification("Successfully updated form info!");

        // ✅ Load updated form now
        this.loadSavedForm(newName);
      },
      error: (err) => {
        console.error("❌ Failed to rename form:", err);
        this.showNotification("Error updating form info!");
      }
    });
  }

  deleteFormName() {
    const formName = this.editFormModel.formName?.trim();
    if (!formName) {
      alert("Form name is missing!");
      return;
    }

    if (!confirm(`Are you sure you want to delete form "${formName}"?`)) {
      return;
    }

    this.http.delete(`http://localhost:3000/forms/${formName}`)
    .subscribe({
      next: () => {
        // ✅ Clear UI if deleted form was open
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
        this.showNotification("Form deleted successfully!");
      },
      error: (err) => {
        console.error("❌ Failed to delete form:", err);
        this.showNotification("Error deleting form!");
      }
    });
  }

  fetchData() {
    if (!this.formHeading) return;

    this.formService.getEntries(this.formHeading).subscribe({
      next: (formEntries: any[]) => {
        // 🟢 Your backend returns: [{ id: 1, data: { name: "John", email: "..." } }, ...]
        // flatten to: { id: 1, name: "John", email: "..." }
        this.users = formEntries.map(e => ({ id: e.id, ...e.data }));

        // Build display fields (column headers)
        if (this.users.length > 0) {
          this.displayFields = Object.keys(this.users[0])
            .filter(k => k !== 'id')   // don’t show raw ID twice
            .map(k => ({ key: k, label: k }));
        }
      },
      error: (err) => {
        console.error("❌ Error fetching entries:", err);
        this.users = [];
        this.displayFields = [];
      }
    });
  }

  onSubmit(model: any) {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.formChanged) {
      alert('Please save the form before submitting data!');
      return;
    }
    if (this.fields.length > 0) {
      const newEntry = { ...model };
      this.formService
      .createEntry(this.formHeading, newEntry)
      .subscribe(() => {
        this.model = {};
        this.form.reset();
        this.fetchData();
        this.isEdit.set(false);
        this.resetFormGroup();
        this.showNotification('Successfully submitted!');
      });
    }
  }

  resetForm() {
    this.model = {};
    this.form.reset();
    this.options.formState = { ...(this.options.formState || {}), submitted: false };
  }

  get hasModel(): boolean {
    return this.model && Object.keys(this.model).length > 0;
  }

  update(model: any) {
    if (this.formChanged) {
      alert("Please save the form before submitting data!");
    } else {
      this.formService.updateEntry(this.formHeading, this.uid(), model).subscribe({
        next: () => {
          this.model = {};
          this.fetchData();  // reload from backend
          this.isEdit.set(false);
          this.resetFormGroup();
          this.showNotification('✅ Successfully updated info!');
        },
        error: (err) => {
          console.error("❌ Update failed:", err);
          this.showNotification('❌ Failed to update entry!');
        }
      });
    }
  }

  deleteUser(id: number) {
    if (!confirm("Are you sure you want to delete this record?")) return;

    this.http.delete(`http://localhost:3000/forms/${this.formHeading}/entries/${id}`)
      .subscribe({
        next: () => {
          this.fetchData(); // reload from backend
          this.showNotification('Successfully deleted info!');
        },
        error: (err: any) => {
          console.error('❌ Failed to delete entry:', err);
          this.showNotification('Failed to delete entry!');
        }
      });
  }

  editUser(id: number) {
    this.formService.getEntry(this.formHeading, id).subscribe({
      next: (entry) => {
        this.model = { ...entry.data };   // ✅ entry.data contains form values
        this.uid.set(id);
        this.isEdit.set(true);
      },
      error: (err) => {
        console.error("❌ Failed to fetch entry:", err);
        this.showNotification('❌ Could not load entry for editing.');
      }
    });
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
    let globalIndex = 0;

    this.fields.forEach((row, rowIndex) => {
      row.fieldGroup?.forEach((field, colIndex) => {
        field.props!['index'] = globalIndex;
        field.props!['openEditFieldModal'] = () => this.openRowEditFieldModal(rowIndex, colIndex);
        field.props!['deleteField'] = () => this.deleteRowField(rowIndex, colIndex);
        field.props!['loadSavedForm'] = () => this.loadSavedForm(this.formHeading);
        field.props!['openEditFormNameModal'] = () => this.openEditFormNameModal(this.formHeading);
        field.props!['deleteFormName'] = () => this.deleteFormName();

        globalIndex++;
      });
    });
  }

  addFixedField(type: 'input' | 'textarea' | 'select' | 'radio' | 'div') {
    const baseStyle = { borderRadius:'', color:'', backgroundColor:'', fontFamily:'', fontSize:'', fontWeight:'' };
    const labelBaseStyle = { backgroundColor:'', color:'', fontFamily:'', fontSize:'', fontWeight:'' };

    const existingIndexes = this.fields
      .flatMap(f => f.fieldGroup || [])
      .filter(f => typeof f.key === 'string' && f.key.startsWith(type))
      .map(f => parseInt((f.key as string).replace(type, ''), 10))
      .filter(num => !isNaN(num))
      .sort((a, b) => a - b);

    let index = 1;
    for (const num of existingIndexes) if (num === index) index++; else break;

    const currentWrapper = this.fields?.[0]?.fieldGroup?.[0]?.wrappers?.[0] ?? 'form-field-horizontal';

    const newField: FormlyFieldConfig = {
      className: 'col-12',
      key: `${type}${index}`,
      type: (type === 'div' ? 'input' : type),
      wrappers: [currentWrapper],
      props: {
        label: `${type}${index}`,
        id: `${type}${index}`,
        ...(type === 'textarea' || type === 'input' || type === 'div' ? { placeholder: `${type}${index}` } : {}),
        class: type === 'select' ? 'form-select' :
              type === 'radio' ? 'form-check-input' : 'form-control',
        required: true,
        labelClass: type === 'radio' ? 'form-check-label' : 'form-label',
        labelFor: `${type}${index}`,
        style: baseStyle,
        labelStyle: labelBaseStyle,
        ...(type === 'select' ? {
          options: [
            { label: 'Select an option...', value: '', disabled: true },
            { label: 'Option 1', value: 'Option 1' },
            { label: 'Option 2', value: 'Option 2' }
          ]
        } : {}),
        ...(type === 'radio' ? {
          options: [
            { label: 'Option 1', value: 'Option 1' },
            { label: 'Option 2', value: 'Option 2' }
          ]
        } : {})
      },
      validation: { messages: { required: "This field is required!" } }
    };

    if (type === 'select') newField.defaultValue = '';

    if (type === 'div') {
      this.fields.push({
        fieldGroupClassName: 'row',
        fieldGroup: []
      });
    } else {
      if (this.selectedRowIndex !== null) {
        this.fields[this.selectedRowIndex].fieldGroup?.push(newField);
      } else {
        // fallback if no row selected
        if (this.fields.length === 0) {
          this.fields.push({
            fieldGroupClassName: 'row',
            fieldGroup: [newField]
          });
        } else {
          this.fields[0].fieldGroup?.push(newField);
        }
      }
    }

    this.fields = [...this.fields];
    this.selectedFieldIndex = null;
    this.reattachFieldFunctions();
    this.cancelFieldModal();

    this.formChanged = true;
    this.showNotification('Field added (not saved yet)!');
  }

  type = signal('');

  getValue(user: any, key: any) {
    if (!key) return '';
    return user[key] ?? '';
  }

  editingFieldIndex: number | null = null;

  openRowEditFieldModal(rowIndex: number, fieldIndex: number) {
    const field = this.fields[rowIndex].fieldGroup![fieldIndex];
    this.editingFieldIndex = field.props?.['index'] ?? null;

    if (this.editingFieldIndex === null) return;

    const type = typeof field.type === 'string' ? field.type : 'input';
    this.type.set(type);

    this.modalStep.set('configure');

    const style = field.props?.['style'] || {};
    const labelStyle = field.props?.['labelStyle'] || {};

    // Keep style objects separate
    this.modalModel = {
      key: field.key,
      label: field.props?.label || '',
      className: field.className || '',
      class: field.props?.['class'] || '',
      labelClass: field.props?.['labelClass'] || '',
      placeholder: field.props?.placeholder || '',
      required: !!field.props?.required,
      options: Array.isArray(field.props?.options)
        ? field.props.options.map((o: any) => o.label).join(', ')
        : '',
      style: { ...style },
      labelStyle: { ...labelStyle }
    };

    // Start base field group
    this.modalFields = [
      {
        fieldGroupClassName: 'row',
        fieldGroup: [
          { key: 'key', type: 'input', className: 'col-md-6', props: { label: 'Key', required: true } },
          { key: 'label', type: 'input', className: 'col-md-6', props: { label: 'Label', required: true } },
          { key: 'placeholder', type: 'input', className: 'col-md-6', props: { label: 'Placeholder' } },
          { key: 'class', type: 'input', className: 'col-md-6', props: { label: 'Class' } },
          { key: 'labelClass', type: 'input', className: 'col-md-6', props: { label: 'Label Class' } },
          { key: 'className', type: 'input', className: 'col-md-6', props: { label: 'Class Name' } },
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

    // Input Style
    this.modalFields.push({ template: '<h4 class="mt-3 mb-2">Input Style</h4>' });
    this.modalFields.push({
      fieldGroupClassName: 'row',
      fieldGroup: Object.keys(style).map(sk => ({
        key: `style.${sk}`,
        type: 'input',
        className: 'col-md-6',
        props: { label: sk }
      }))
    });

    // Label Style
    this.modalFields.push({ template: '<h4 class="mt-3 mb-2">Label Style</h4>' });
    this.modalFields.push({
      fieldGroupClassName: 'row',
      fieldGroup: Object.keys(labelStyle).map(sk => ({
        key: `labelStyle.${sk}`,
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
      return;
    }

    let targetRowIndex = -1;
    let targetFieldIndex = -1;
    let globalIndex = 0;

    // find correct field by global index
    outer: for (let r = 0; r < this.fields.length; r++) {
      const row = this.fields[r];
      for (let f = 0; f < (row.fieldGroup?.length || 0); f++) {
        if (globalIndex === this.editingFieldIndex) {
          targetRowIndex = r;
          targetFieldIndex = f;
          break outer;
        }
        globalIndex++;
      }
    }

    if (targetRowIndex === -1 || targetFieldIndex === -1) return;

    const row = this.fields[targetRowIndex];
    const field = row.fieldGroup![targetFieldIndex];

    const oldKey = field.key as string;
    const newKey = this.modalModel.key;

    // --- migrate key if changed ---
    if (oldKey && newKey && oldKey !== newKey) {
      this.updateFieldKey(oldKey, newKey);
    }

    // build updatedField
    const updatedStyle: any = {};
    Object.keys(field.props?.['style'] || {}).forEach(k => {
      let val = this.modalModel.style?.[k] || '';
      if ((k === 'borderRadius' || k === 'fontSize') && val !== '') {
        const num = val.toString().trim();
        if (/^\d+$/.test(num)) {
          val = `${num}px`;
        }
      }
      updatedStyle[k] = val;
    });

    const updatedLabelStyle: any = {};
    Object.keys(field.props?.['labelStyle'] || {}).forEach(k => {
      let val = this.modalModel.labelStyle?.[k] || '';
      if (k === 'fontSize' && val !== '') {
        const num = val.toString().trim();
        if (/^\d+$/.test(num)) {
          val = `${num}px`;
        }
      }
      updatedLabelStyle[k] = val;
    });

    const updatedField: FormlyFieldConfig = {
      ...field,
      key: newKey,
      className: this.modalModel.className,
      props: {
        ...field.props,
        label: this.modalModel.label,
        class: this.modalModel.class,
        id: newKey,
        labelClass: this.modalModel.labelClass,
        placeholder: this.modalModel.placeholder,
        required: !!this.modalModel.required,
        index: this.editingFieldIndex,
        options: this.modalModel.options
          ? this.modalModel.options.split(',').map((opt: string) => ({
              label: opt.trim(),
              value: opt.trim()
            }))
          : field.props?.options,
        style: updatedStyle,
        labelStyle: updatedLabelStyle
      }
    };

    row.fieldGroup![targetFieldIndex] = updatedField;

    this.fields = [...this.fields];
    this.reattachFieldFunctions();
    this.formChanged = true;

    this.editingFieldIndex = null;
    this.modalStep.set('select');
    this.modalForm.reset();
    this.modalModel = {};
    this.showNotification('Field updated (remember to Save Form)!');
  }

  updateFieldKey(oldKey: string, newKey: string) {
    // update users table
    this.users = this.users.map(u => {
      if (u.hasOwnProperty(oldKey)) {
        u[newKey] = u[oldKey];
        delete u[oldKey];
      }
      return u;
    });

    // update model
    if (this.model.hasOwnProperty(oldKey)) {
      this.model[newKey] = this.model[oldKey];
      delete this.model[oldKey];
    }

    // update form controls
    if (this.form.contains(oldKey)) {
      const ctrl = this.form.get(oldKey);
      this.form.removeControl(oldKey);
      this.form.addControl(newKey, ctrl!);
    }

    // persist to backend
    this.users.forEach(user => {
      const { id, ...data } = user;
      this.formService.updateEntry(this.formHeading, id, data).subscribe();
    });

    // update displayFields
    this.displayFields = this.displayFields.map(f =>
      f.key === oldKey ? { key: newKey, label: f.label } : f
    );
  }

  deleteRowField(rowIndex: number, fieldIndex: number) {
    if (!confirm("Are you sure you want to delete this field?")) return;
    const row = this.fields[rowIndex];
    if (!row?.fieldGroup) return;

    const field = row.fieldGroup[fieldIndex];
    if (field?.key && this.form.contains(field.key as string)) {
      this.form.removeControl(field.key as string);
    }

    row.fieldGroup.splice(fieldIndex, 1); // ✅ remove the correct field
    if (row.fieldGroup.length === 0) {
      this.fields.splice(rowIndex, 1); // remove empty row
    }

    this.fields = [...this.fields]; // 🔹 trigger refresh
    this.reattachFieldFunctions();
    this.formChanged = true;
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
  selectedRowIndex: number | null = null;
  selectedGroupIndex: number | null = null;

  editContextMenu(event: MouseEvent, rowIndex: number, fieldIndex: number) {
    event.preventDefault(); // Stop default browser menu
    this.selectedRowIndex = rowIndex;
    this.selectedFieldIndex = fieldIndex;
    this.menuPosition = { x: event.clientX, y: event.clientY }; // Position menu at cursor
    this.editMenuVisible = true; // Show the field edit menu
  }

  onMenuClick(action: 'deleteFormName' | 'openEditFormNameModal' | 'loadSavedForm' | 'openEditFieldModal' | 'deleteField') {
    if (action === 'openEditFormNameModal') {
      this.openEditFormNameModal(this.selectedContextFormName);
    } else if (action === 'deleteFormName') {
      this.editFormModel.formName = this.selectedContextFormName;
      this.deleteFormName();
    } else if (action === 'loadSavedForm') {
      this.loadSavedForm(this.selectedContextFormName);
    } else if (action === 'openEditFieldModal') {
      if (this.selectedRowIndex !== null && this.selectedFieldIndex !== null) {
        this.openRowEditFieldModal(this.selectedRowIndex, this.selectedFieldIndex);
      }
    } else if (action === 'deleteField') {
      if (this.selectedRowIndex !== null && this.selectedFieldIndex !== null) {
        this.deleteRowField(this.selectedRowIndex, this.selectedFieldIndex);
      }
    }
    this.editMenuVisible = false;
    this.selectedRowIndex = null;
    this.selectedFieldIndex = null;
    this.menuVisible = false;
  }

  drop(event: CdkDragDrop<FormlyFieldConfig[]>, list: FormlyFieldConfig[]) {
    // Case 1: Moving inside the same list (reorder)
    if (event.previousContainer === event.container) {
      moveItemInArray(list, event.previousIndex, event.currentIndex);
    } 
    // Case 2: Moving across child divs (drag field into another fieldGroup)
    else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }

    // Update indexes for consistency
    list.forEach((f, i) => {
      if (!f.props) f.props = {};
      f.props['index'] = i;
    });

    // Ensure functions (edit/delete) are still attached
    this.reattachFieldFunctions();

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
      let counter = 0;

      const targetGroup = this.selectedGroupIndex !== null
        ? this.fields[this.selectedGroupIndex].fieldGroup ?? []
        : [];

      this.allFieldsFields = targetGroup.map((f) => {
        const i = counter++;

        this.allFieldsModel[`key_${i}`] = f.key;
        this.allFieldsModel[`className_${i}`] = f.className;
        this.allFieldsModel[`label_${i}`] = f.props?.label;
        this.allFieldsModel[`placeholder_${i}`] = f.props?.placeholder;
        this.allFieldsModel[`class_${i}`] = f.props?.['class'];
        this.allFieldsModel[`required_${i}`] = f.props?.required;

        if (f.type === 'select' || f.type === 'radio') {
          this.allFieldsModel[`options_${i}`] = Array.isArray(f.props?.options)
            ? f.props.options.map((opt: any) => opt.label || opt).join(',')
            : '';
        }

        return {
          fieldGroupClassName: 'row mb-3',
          fieldGroup: [
            { template: `<h4 class="mt-3 mb-2">${f.key}</h4>` },
            { key: `key_${i}`, type: 'input', className: 'col-3', props: { label: `Key` } },
            { key: `label_${i}`, type: 'input', className: 'col-3', props: { label: `Label` } },
            f.type === 'select' || f.type === 'radio'
              ? { key: `options_${i}`, type: 'input', className: 'col-3', props: { label: `Options` } }
              : { key: `placeholder_${i}`, type: 'input', className: 'col-3', props: { label: `Placeholder` } },
            { key: `className_${i}`, type: 'input', className: 'col-3', props: { label: `Class Name` } },
            { key: `required_${i}`, type: 'checkbox', className: 'col-3', props: { label: `Required` } }
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
    if (this.selectedGroupIndex === null) return;

    let counter = 0;
    const updatedGroup = this.fields[this.selectedGroupIndex].fieldGroup?.map(field => {
      const i = counter++;
      const updatedProps: any = {
        ...field.props,
        label: this.allFieldsModel[`label_${i}`] ?? field.props?.label,
        class: this.allFieldsModel[`class_${i}`] ?? field.props?.['class'],
        required: !!this.allFieldsModel[`required_${i}`]
      };

      if (field.type === 'select' || field.type === 'radio') {
        const optsStr = this.allFieldsModel[`options_${i}`];
        updatedProps.options = optsStr
          ? optsStr.split(',').map((opt: string) => ({ label: opt.trim(), value: opt.trim() }))
          : field.props?.options;
      } else {
        updatedProps.placeholder = this.allFieldsModel[`placeholder_${i}`] ?? field.props?.placeholder;
      }

      return {
        ...field,
        key: this.allFieldsModel[`key_${i}`] ?? field.key,
        className: this.allFieldsModel[`className_${i}`] ?? field.className,
        props: updatedProps
      };
    }) ?? [];

    this.fields[this.selectedGroupIndex] = {
      ...this.fields[this.selectedGroupIndex],
      fieldGroup: updatedGroup
    };

    this.fields = [...this.fields];
    this.reattachFieldFunctions();
    this.formChanged = true;
    this.allFieldsModalOpen.set(false);
    this.showNotification('Field group updated (remember to Save Form)!');
  }

  toggleGlobalFieldsModal() {
    if (!this.globalFieldsModalOpen()) {
      this.globalFieldsModel = {};
      let counter = 0;

      this.globalFieldsFields = this.fields.flatMap((row) =>
        row.fieldGroup?.map((f) => {
          const i = counter++;

          this.globalFieldsModel[`key_${i}`] = f.key;
          this.globalFieldsModel[`className_${i}`] = f.className;
          this.globalFieldsModel[`label_${i}`] = f.props?.label;
          this.globalFieldsModel[`placeholder_${i}`] = f.props?.placeholder;
          this.globalFieldsModel[`class_${i}`] = f.props?.['class'];
          this.globalFieldsModel[`required_${i}`] = f.props?.required;

          if (f.type === 'select' || f.type === 'radio') {
            this.globalFieldsModel[`options_${i}`] = Array.isArray(f.props?.options)
              ? f.props.options.map((opt: any) => opt.label || opt).join(',')
              : '';
          }
          return {
            fieldGroupClassName: 'row mb-3',
            fieldGroup: [
              { template: `<h4 class="mt-3 mb-2">${f.key}</h4>` },
              { key: `key_${i}`, type: 'input', className: 'col-3', props: { label: `Key` } },
              { key: `label_${i}`, type: 'input', className: 'col-3', props: { label: `Label` } },
              f.type === 'select' || f.type === 'radio'
                ? { key: `options_${i}`, type: 'input', className: 'col-3', props: { label: `Options` } }
                : { key: `placeholder_${i}`, type: 'input', className: 'col-3', props: { label: `Placeholder` } },
              { key: `className_${i}`, type: 'input', className: 'col-3', props: { label: `Class Name` } },
              { key: `required_${i}`, type: 'checkbox', className: 'col-3', props: { label: `Required` } }
            ]
          };
        }) || []
      );
      this.globalFieldsForm = this.fb.group({});
      this.globalFieldsModalOpen.set(true);
    } else {
      this.globalFieldsModalOpen.set(false);
    }
  }

  saveGlobalFieldsEdit() {
    let counter = 0;
    this.fields = this.fields.map(row => ({
      ...row,
      fieldGroup: row.fieldGroup?.map(field => {
        const i = counter++;
        const updatedProps: any = {
          ...field.props,
          label: this.globalFieldsModel[`label_${i}`] ?? field.props?.label,
          class: this.globalFieldsModel[`class_${i}`] ?? field.props?.['class'],
          required: !!this.globalFieldsModel[`required_${i}`]
        };
        if (field.type === 'select' || field.type === 'radio') {
          const optsStr = this.globalFieldsModel[`options_${i}`];
          updatedProps.options = optsStr
            ? optsStr.split(',').map((opt: string) => ({ label: opt.trim(), value: opt.trim() }))
            : field.props?.options;
        } else {
          updatedProps.placeholder = this.globalFieldsModel[`placeholder_${i}`] ?? field.props?.placeholder;
        }
        return {
          ...field,
          key: this.globalFieldsModel[`key_${i}`] ?? field.key,
          className: this.globalFieldsModel[`className_${i}`] ?? field.className,
          props: updatedProps
        };
      })
    }));
    this.fields = [...this.fields];
    this.reattachFieldFunctions();
    this.formChanged = true;
    this.globalFieldsModalOpen.set(false);
    this.showNotification('All fields updated (remember to Save Form)!');
  }

  deleteFieldGroup(index: number) {
    if (!confirm("Delete this div and its fields?")) return;
    this.fields.splice(index, 1);
    this.fields = [...this.fields]; // force UI refresh
    this.formChanged = true;
    this.showNotification("Field group deleted (remember to Save Form)!");
  }

  deleteAllFields() {
    if (!this.formHeading) return; // no active form
    if (!confirm("Are you sure you want to delete all fields?")) return;

    // Clear all fields in the UI only
    this.fields = [];
    this.form = new FormGroup({});
    this.model = {};
    this.displayFields = [];

    // Do NOT touch localStorage here!
    // localStorage.setItem('savedForms', ...) ❌

    this.fields = [...this.fields]; // 🔹 force re-render
    this.formChanged = true; // mark unsaved changes
    this.showNotification("All fields deleted (remember to Save Form)!");
  }

  expanded: { [k: string]: boolean } = {};

  toggle(key: string) {
    this.expanded[key] = !this.expanded[key];

    // If parent is closed, collapse all its children too
    if (key === 'parent' && !this.expanded[key]) {
      Object.keys(this.expanded).forEach(k => {
        if (k.startsWith('child-')) {
          this.expanded[k] = false;
        }
      });
    }
  }

  setSelectedRowIndex(i: number) {
    this.selectedRowIndex = i;
  }

  openAllFieldsModal(groupIndex: number) {
    this.selectedGroupIndex = groupIndex;
    this.toggleAllFieldsModal();
  }
}