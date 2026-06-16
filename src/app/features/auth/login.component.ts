import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, LoginPayload } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { SpinnerComponent } from '../../shared/components/spinner.component';
import { AutofocusDirective } from '../../shared/directives/autofocus.directive';
import { ApiError, OtpPendingResponse } from '../../core/models/api-response.model';

function mobileValidator(c: AbstractControl): ValidationErrors | null {
  const v: string = c.value ?? '';
  return v && !/^\+?[0-9]{7,15}$/.test(v) ? { invalidMobile: true } : null;
}

type LoginStep = 'credentials' | 'otp';
type IdentifierType = 'username' | 'email' | 'mobile';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, SpinnerComponent, AutofocusDirective],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  step: LoginStep = 'credentials';
  loading = false;
  showPassword = false;
  loginToken = '';
  otpSentTo = '';

  credForm = this.fb.group({
    identifier: ['', Validators.required],
    password:   ['']
  });

  otpForm = this.fb.group({
    otp: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(8)]]
  });

  get identifier() { return this.credForm.controls.identifier; }
  get password()   { return this.credForm.controls.password; }
  get otp()        { return this.otpForm.controls.otp; }

  get identifierType(): IdentifierType {
    const v = this.identifier.value ?? '';
    if (v.includes('@'))          return 'email';
    if (/^\+?[0-9]/.test(v))     return 'mobile';
    return 'username';
  }

  get isMobile(): boolean { return this.identifierType === 'mobile'; }

  identifierError(): string | null {
    if (!this.identifier.touched) return null;
    if (this.identifier.hasError('required')) return 'This field is required.';
    return null;
  }

  passwordError(): string | null {
    if (!this.password.touched || this.isMobile) return null;
    if (this.password.hasError('required')) return 'Password is required.';
    return null;
  }

  otpError(): string | null {
    if (!this.otp.touched) return null;
    if (this.otp.hasError('required'))  return 'OTP is required.';
    if (this.otp.hasError('minlength')) return 'OTP is too short.';
    return null;
  }

  onSubmitCredentials(): void {
    if (!this.isMobile) {
      this.password.setValidators(Validators.required);
      this.password.updateValueAndValidity();
    } else {
      this.password.clearValidators();
      this.password.updateValueAndValidity();
    }

    this.credForm.markAllAsTouched();
    if (this.credForm.invalid) return;

    const v = this.identifier.value!.trim();
    const payload: LoginPayload = this.isMobile
      ? { mobile: v }
      : this.identifierType === 'email'
        ? { email: v,    password: this.password.value! }
        : { username: v, password: this.password.value! };

    this.loading = true;
    this.authService.login(payload).subscribe({
      next: res => {
        this.loading = false;
        if (res.otpRequired) {
          this.loginToken = (res as OtpPendingResponse).loginToken;
          this.otpSentTo  = v;
          this.step = 'otp';
          this.toast.info('OTP sent. Please check your ' + (this.isMobile ? 'mobile' : 'email') + '.');
        } else {
          this.toast.success('Welcome back!');
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err: ApiError) => {
        this.toast.error(err?.message ?? 'Login failed.');
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
        this.toast.success('Welcome back!');
        this.router.navigate(['/dashboard']);
      },
      error: (err: ApiError) => {
        this.toast.error(err?.message ?? 'Invalid OTP.');
        this.loading = false;
      }
    });
  }

  backToCredentials(): void {
    this.step = 'credentials';
    this.otpForm.reset();
    this.loginToken = '';
  }
}
