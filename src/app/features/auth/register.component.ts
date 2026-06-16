import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { SpinnerComponent } from '../../shared/components/spinner.component';
import { AutofocusDirective } from '../../shared/directives/autofocus.directive';
import { ApiError } from '../../core/models/api-response.model';

function passwordStrengthValidator(c: AbstractControl): ValidationErrors | null {
  const v: string = c.value ?? '';
  if (!v) return null;
  if (!/[A-Z]/.test(v)) return { noUppercase: true };
  if (!/[0-9]/.test(v)) return { noNumber: true };
  return null;
}

type RegisterStep = 'form' | 'otp';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, SpinnerComponent, AutofocusDirective],
  templateUrl: './register.component.html'
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private router      = inject(Router);
  private toast       = inject(ToastService);
  private fb          = inject(FormBuilder);

  step: RegisterStep = 'form';
  loading = false;
  showPassword = false;
  loginToken = '';
  generatedUsername = '';
  profilePicFile: File | null = null;
  profilePicPreview: string | null = null;
  serverFieldErrors: Record<string, string> = {};

  form = this.fb.group({
    firstName: ['', Validators.required],
    lastName:  ['', Validators.required],
    email:     ['', [Validators.required, Validators.email]],
    mobile:    [''],
    password:  ['', [Validators.required, Validators.minLength(8), passwordStrengthValidator]],
    role:      ['USER']
  });

  otpForm = this.fb.group({
    otp: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(8)]]
  });

  get firstName() { return this.form.controls.firstName; }
  get lastName()  { return this.form.controls.lastName; }
  get email()     { return this.form.controls.email; }
  get mobile()    { return this.form.controls.mobile; }
  get password()  { return this.form.controls.password; }
  get otp()       { return this.otpForm.controls.otp; }

  get passwordStrength(): { label: string; color: string; width: string } {
    const p: string = this.password.value ?? '';
    if (!p) return { label: '', color: '', width: '0%' };
    let score = 0;
    if (p.length >= 8)           score++;
    if (/[A-Z]/.test(p))        score++;
    if (/[0-9]/.test(p))        score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    if (score <= 1) return { label: 'Weak',   color: '#f87171', width: '25%' };
    if (score === 2) return { label: 'Fair',   color: '#facc15', width: '50%' };
    if (score === 3) return { label: 'Good',   color: '#60a5fa', width: '75%' };
    return                { label: 'Strong', color: '#10b981', width: '100%' };
  }

  firstNameError(): string | null {
    if (!this.firstName.touched) return null;
    if (this.firstName.hasError('required')) return 'First name is required.';
    return this.serverFieldErrors['firstName'] ?? null;
  }

  lastNameError(): string | null {
    if (!this.lastName.touched) return null;
    if (this.lastName.hasError('required')) return 'Last name is required.';
    return this.serverFieldErrors['lastName'] ?? null;
  }

  emailError(): string | null {
    if (!this.email.touched) return null;
    if (this.email.hasError('required')) return 'Email is required.';
    if (this.email.hasError('email'))    return 'Enter a valid email address.';
    return this.serverFieldErrors['email'] ?? null;
  }

  passwordError(): string | null {
    if (!this.password.touched) return null;
    if (this.password.hasError('required'))    return 'Password is required.';
    if (this.password.hasError('minlength'))   return 'Min 8 characters.';
    if (this.password.hasError('noUppercase')) return 'Must contain an uppercase letter.';
    if (this.password.hasError('noNumber'))    return 'Must contain a number.';
    return this.serverFieldErrors['password'] ?? null;
  }

  otpError(): string | null {
    if (!this.otp.touched) return null;
    if (this.otp.hasError('required'))  return 'OTP is required.';
    if (this.otp.hasError('minlength')) return 'OTP is too short.';
    return null;
  }

  onProfilePicChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.profilePicFile = file;
    if (file) {
      const reader = new FileReader();
      reader.onload = () => this.profilePicPreview = reader.result as string;
      reader.readAsDataURL(file);
    } else {
      this.profilePicPreview = null;
    }
  }

  onSubmit(): void {
    this.serverFieldErrors = {};
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const v = this.form.getRawValue();
    this.loading = true;
    this.authService.register({
      firstName:  v.firstName!,
      lastName:   v.lastName!,
      email:      v.email!,
      password:   v.password!,
      mobile:     v.mobile || undefined,
      role:       v.role   || undefined,
      profilePic: this.profilePicFile
    }).subscribe({
      next: res => {
        this.loading = false;
        if (res.otpRequired) {
          this.loginToken        = res.loginToken;
          this.generatedUsername = res.username ?? '';
          this.step = 'otp';
          this.toast.info(res.message ?? 'OTP sent. Please verify.');
        } else {
          this.toast.success('Account created! Welcome 🎉');
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err: ApiError) => {
        if (err?.details) this.serverFieldErrors = err.details;
        this.toast.error(err?.message ?? 'Registration failed.');
        this.loading = false;
      }
    });
  }

  onSubmitOtp(): void {
    this.otpForm.markAllAsTouched();
    if (this.otpForm.invalid) return;
    this.loading = true;
    this.authService.verifyOtp(this.loginToken, this.otp.value!.trim()).subscribe({
      next: () => {
        this.toast.success('Account created! Welcome 🎉');
        this.router.navigate(['/dashboard']);
      },
      error: (err: ApiError) => {
        this.toast.error(err?.message ?? 'Invalid OTP.');
        this.loading = false;
      }
    });
  }

  backToForm(): void {
    this.step = 'form';
    this.otpForm.reset();
    this.loginToken = '';
  }
}
