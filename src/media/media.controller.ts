import { Controller, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Admin, CurrentUser, Principal } from '../auth/auth.guard';
import { ApiRequest, fail } from '../common/http';
import { MediaService, UploadedImage } from './media.service';

const body = {
  schema: {
    type: 'object',
    required: ['file'],
    properties: { file: { type: 'string', format: 'binary' } },
  },
};

@ApiTags('Media')
@ApiBearerAuth()
@Controller('media')
export class MediaController {
  constructor(private readonly service: MediaService) {}

  private async image(request: ApiRequest): Promise<UploadedImage> {
    if (!request.isMultipart()) fail(400, 'INVALID_FILE', 'A multipart image file is required');
    let image: UploadedImage | undefined;
    for await (const part of request.parts()) {
      if (part.type !== 'file' || part.fieldname !== 'file' || image)
        fail(400, 'INVALID_FILE', 'Exactly one file named file is required');
      const buffer = await part.toBuffer();
      image = { buffer, size: buffer.length, mimetype: part.mimetype };
    }
    if (!image) fail(400, 'INVALID_FILE', 'An image file is required');
    return image;
  }

  @Post('avatar')
  @ApiConsumes('multipart/form-data')
  @ApiBody(body)
  async avatar(@Req() request: ApiRequest, @CurrentUser() user: Principal) {
    return this.service.upload(await this.image(request), user.id, true);
  }

  @Admin()
  @Post('images')
  @ApiConsumes('multipart/form-data')
  @ApiBody(body)
  async upload(@Req() request: ApiRequest, @CurrentUser() user: Principal) {
    return this.service.upload(await this.image(request), user.id);
  }
}
