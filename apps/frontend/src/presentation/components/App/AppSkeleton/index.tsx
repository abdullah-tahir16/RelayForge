import Skeleton, { SkeletonProps } from '@mui/material/Skeleton';

export interface AppSkeletonProps extends SkeletonProps {}

const AppSkeleton = (props: AppSkeletonProps) => {
  return (
    <Skeleton
      animation="wave"
      variant="rounded"
      {...props}
      sx={{ borderRadius: 3, ...props.sx }}
    />
  );
};

export default AppSkeleton;
