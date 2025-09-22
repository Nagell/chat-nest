import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class CreateSessionDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  visitor_email: string;

  @IsOptional()
  @IsString()
  @Length(1, 100, { message: 'Name must be between 1 and 100 characters' })
  visitor_name?: string;
}
