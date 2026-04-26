import { OnboardingPath } from '@onboarding/domain/enums/onboarding-path.enum';
import { OnboardingStatus } from '@onboarding/domain/enums/onboarding-status.enum';
import { StepNumberVO } from '@onboarding/domain/value-objects/step-number.vo';
import { InvitationCodeVO } from '@onboarding/domain/value-objects/invitation-code.vo';
import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';

export interface OnboardingSessionCreateProps {
  userUUID: string;
}

export interface OnboardingSessionReconstituteProps {
  id: string;
  userUUID: string;
  path: OnboardingPath | null;
  currentStep: number;
  stepData: Record<string, unknown>;
  invitationCode: string | null;
  status: OnboardingStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class OnboardingSessionModel {
  private _id: string;
  private _userUUID: UUIDVO;
  private _path: OnboardingPath | null;
  private _currentStep: StepNumberVO;
  private _stepData: Record<string, unknown>;
  private _invitationCode: InvitationCodeVO | null;
  private _status: OnboardingStatus;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: OnboardingSessionReconstituteProps) {
    this._id = props.id;
    this._userUUID = new UUIDVO(props.userUUID);
    this._path = props.path;
    this._currentStep = StepNumberVO.create(props.currentStep);
    this._stepData = props.stepData;
    this._invitationCode =
      props.invitationCode !== null ? InvitationCodeVO.create(props.invitationCode) : null;
    this._status = props.status;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  static create(props: OnboardingSessionCreateProps): OnboardingSessionModel {
    const now = new Date();
    return new OnboardingSessionModel({
      id: '',
      userUUID: props.userUUID,
      path: null,
      currentStep: 0,
      stepData: {},
      invitationCode: null,
      status: OnboardingStatus.IN_PROGRESS,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: OnboardingSessionReconstituteProps): OnboardingSessionModel {
    return new OnboardingSessionModel(props);
  }

  saveProgress(section: string, data: Record<string, unknown>, currentStep?: number): void {
    this._stepData = { ...this._stepData, [section]: data };
    if (section === 'path') {
      const path = (data['path'] as string | undefined) ?? null;
      this._path =
        path === 'CREATE' ? OnboardingPath.CREATE : path === 'JOIN' ? OnboardingPath.JOIN : null;
      const code = (data['invitationCode'] as string | undefined) ?? null;
      this._invitationCode = code !== null ? InvitationCodeVO.create(code) : null;
    }
    if (currentStep !== undefined && currentStep > this._currentStep.getValue()) {
      this._currentStep = StepNumberVO.create(currentStep);
    }
    this._updatedAt = new Date();
  }

  markCompleted(): void {
    this._status = OnboardingStatus.COMPLETED;
    this._updatedAt = new Date();
  }

  isCompleted(): boolean {
    return this._status === OnboardingStatus.COMPLETED;
  }

  getSectionData(section: string): Record<string, unknown> | null {
    return (this._stepData[section] as Record<string, unknown> | undefined) ?? null;
  }

  get id(): string {
    return this._id;
  }

  get userUUID(): UUIDVO {
    return this._userUUID;
  }

  get path(): OnboardingPath | null {
    return this._path;
  }

  get currentStep(): StepNumberVO {
    return this._currentStep;
  }

  get stepData(): Record<string, unknown> {
    return this._stepData;
  }

  get invitationCode(): InvitationCodeVO | null {
    return this._invitationCode;
  }

  get status(): OnboardingStatus {
    return this._status;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }
}
