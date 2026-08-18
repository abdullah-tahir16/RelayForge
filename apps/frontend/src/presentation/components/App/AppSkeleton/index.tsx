import Skeleton, { SkeletonProps } from '@mui/material/Skeleton';

export interface AppSkeletonProps extends SkeletonProps {}

const AppSkeleton = (props: AppSkeletonProps) => {
  return <Skeleton animation="wave" {...props} />;
};

export default AppSkeleton;
