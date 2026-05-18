select
  id,
  filename,
  extension
from preview_files
where extension in ('ofd', 'dxf', 'ts');
