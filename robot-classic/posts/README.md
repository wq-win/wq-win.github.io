# 机器人经典基础：100篇论文的技术地图

[发展时间线与架构图](00-发展时间线总览.md) · [系列总结](101-系列总结.md)

机器人必须把不完整的观测转化为可执行的运动，并在接触、噪声与算力限制下保持可靠。经典基础围绕六个问题展开：如何描述位置，如何估计状态，如何预测受力后的运动，如何寻找可行路径，如何通过反馈实现目标，以及如何评价整个系统。

本系列按所选论文版本的年代排列。同一年内的编号是阅读顺序，不表示月份先后。预印本、技术报告与期刊版的区别在各文开头说明；经典基础不以追逐最新发表年份为目标。公式和伪代码采用便于教学的统一记号，不能据此推断原代码的接口。

## 如何阅读

初读先回答“输入是什么、输出是什么、哪一个假设使问题可解”，再看推导。第二遍追踪代价、约束和误差如何传播；第三遍对照证据，区分数学结论、特定平台观察和向其他任务推广的推断。每篇末尾的问答用于检验机制与边界，答案并非需要逐字记忆的定义。

## 论文目录

| 篇目 | 年份 | 专题 | 原论文 |
|---|---:|---|---|
| [001 · dh](001-dh.md) | 1955 | 几何 | [A Kinematic Notation for Lower-Pair Mechanisms Based on Matrices](https://doi.org/10.1115/1.4011045) |
| [002 · kalman](002-kalman.md) | 1960 | 估计 | [A New Approach to Linear Filtering and Prediction Problems](https://doi.org/10.1115/1.3662552) |
| [003 · astar](003-astar.md) | 1968 | 规划 | [A Formal Basis for the Heuristic Determination of Minimum Cost Paths](https://doi.org/10.1109/TSSC.1968.300136) |
| [004 · resolved-rate](004-resolved-rate.md) | 1969 | 几何 | [Resolved Motion Rate Control of Manipulators and Human Prostheses](https://doi.org/10.1109/TMMS.1969.299896) |
| [005 · newton-euler](005-newton-euler.md) | 1980 | 动力学 | [On-Line Computational Scheme for Mechanical Manipulators](https://doi.org/10.1115/1.3149599) |
| [006 · ransac](006-ransac.md) | 1981 | 视觉 | [Random Sample Consensus: A Paradigm for Model Fitting with Applications to Image Analysis and Automated Cartography](https://doi.org/10.1145/358669.358692) |
| [007 · hybrid-force](007-hybrid-force.md) | 1981 | 控制 | [Hybrid Position/Force Control of Manipulators](https://fab.cba.mit.edu/classes/865.15/classes/measurement/hybrid-position-force.pdf) |
| [008 · lucas-kanade](008-lucas-kanade.md) | 1981 | 视觉 | [An Iterative Image Registration Technique with an Application to Stereo Vision](https://publications.ri.cmu.edu/storage/publications/pub_files/pub3/lucas_bruce_d_1981_1/lucas_bruce_d_1981_1.pdf) |
| [009 · configuration-space](009-configuration-space.md) | 1983 | 规划 | [Spatial Planning: A Configuration Space Approach](https://doi.org/10.1109/TC.1983.1676196) |
| [010 · featherstone](010-featherstone.md) | 1983 | 动力学 | [The Calculation of Robot Dynamics Using Articulated-Body Inertias](https://doi.org/10.1177/027836498300200102) |
| [011 · brockett](011-brockett.md) | 1984 | 几何 | [Robotic Manipulators and the Product of Exponentials Formula](https://doi.org/10.1007/BFb0031048) |
| [012 · manipulability](012-manipulability.md) | 1985 | 几何 | [Manipulability of Robotic Mechanisms](https://doi.org/10.1177/027836498500400201) |
| [013 · impedance](013-impedance.md) | 1985 | 控制 | [Impedance Control: An Approach to Manipulation—Part I: Theory](https://doi.org/10.1115/1.3140702) |
| [014 · potential-field](014-potential-field.md) | 1986 | 规划 | [Real-Time Obstacle Avoidance for Manipulators and Mobile Robots](https://doi.org/10.1177/027836498600500106) |
| [015 · subsumption](015-subsumption.md) | 1986 | 系统 | [A Robust Layered Control System for a Mobile Robot](https://doi.org/10.1109/JRA.1986.1087032) |
| [016 · damped-ik](016-damped-ik.md) | 1986 | 几何 | [Inverse Kinematic Solutions With Singularity Robustness for Robot Manipulator Control](https://doi.org/10.1115/1.3143764) |
| [017 · uncertain-map](017-uncertain-map.md) | 1986 | 估计 | [On the Representation and Estimation of Spatial Uncertainty](https://doi.org/10.1177/027836498600500404) |
| [018 · operational-space](018-operational-space.md) | 1987 | 控制 | [A Unified Approach for Motion and Force Control of Robot Manipulators: The Operational Space Formulation](https://doi.org/10.1109/JRA.1987.1087068) |
| [019 · adaptive-control](019-adaptive-control.md) | 1987 | 控制 | [On the Adaptive Control of Robot Manipulators](https://doi.org/10.1177/027836498700600303) |
| [020 · tsai-calibration](020-tsai-calibration.md) | 1987 | 视觉 | [A Versatile Camera Calibration Technique for High-Accuracy 3D Machine Vision Metrology Using Off-the-Shelf TV Cameras and Lenses](https://doi.org/10.1109/JRA.1987.1087109) |
| [021 · horn](021-horn.md) | 1987 | 几何 | [Closed-Form Solution of Absolute Orientation Using Unit Quaternions](https://doi.org/10.1364/JOSAA.4.000629) |
| [022 · gilbert-distance](022-gilbert-distance.md) | 1988 | 规划 | [A Fast Procedure for Computing the Distance Between Complex Objects in Three-Dimensional Space](https://doi.org/10.1109/56.2083) |
| [023 · harris](023-harris.md) | 1988 | 视觉 | [A Combined Corner and Edge Detector](https://doi.org/10.5244/C.2.23) |
| [024 · hand-eye](024-hand-eye.md) | 1989 | 视觉 | [A New Technique for Fully Autonomous and Efficient 3D Robotics Hand/Eye Calibration](https://doi.org/10.1109/70.34770) |
| [025 · occupancy](025-occupancy.md) | 1989 | 估计 | [Using Occupancy Grids for Mobile Robot Perception and Navigation](https://doi.org/10.1109/2.30720) |
| [026 · vfh](026-vfh.md) | 1991 | 导航 | [The Vector Field Histogram—Fast Obstacle Avoidance for Mobile Robots](https://doi.org/10.1109/70.88137) |
| [027 · lipm](027-lipm.md) | 1991 | 腿足 | [Study of Dynamic Biped Locomotion on Rugged Terrain—Derivation and Application of the Linear Inverted Pendulum Mode](https://doi.org/10.1109/ROBOT.1991.131811) |
| [028 · icp](028-icp.md) | 1992 | 视觉 | [A Method for Registration of 3-D Shapes](https://doi.org/10.1109/34.121791) |
| [029 · navigation-functions](029-navigation-functions.md) | 1992 | 规划 | [Exact Robot Navigation Using Artificial Potential Functions](https://doi.org/10.1109/70.163777) |
| [030 · grasp-quality](030-grasp-quality.md) | 1992 | 抓取 | [Planning Optimal Grasps](https://doi.org/10.1109/ROBOT.1992.219918) |
| [031 · bootstrap-filter](031-bootstrap-filter.md) | 1993 | 估计 | [Novel Approach to Nonlinear/Non-Gaussian Bayesian State Estimation](https://doi.org/10.1049/ip-f-2.1993.0015) |
| [032 · dstar](032-dstar.md) | 1994 | 规划 | [Optimal and Efficient Path Planning for Partially-Known Environments](https://www.ri.cmu.edu/pub_files/pub1/stentz_anthony_1994_1/stentz_anthony_1994_1.pdf) |
| [033 · good-features](033-good-features.md) | 1994 | 视觉 | [Good Features to Track](https://doi.org/10.1109/CVPR.1994.323794) |
| [034 · force-closure](034-force-closure.md) | 1995 | 抓取 | [On the Closure Properties of Robotic Grasping](https://www.centropiaggio.unipi.it/sites/default/files/grasp-IJRR95.pdf) |
| [035 · prm](035-prm.md) | 1996 | 规划 | [Probabilistic Roadmaps for Path Planning in High-Dimensional Configuration Spaces](https://doi.org/10.1109/70.508439) |
| [036 · impulse-contact](036-impulse-contact.md) | 1996 | 接触 | [An Implicit Time-Stepping Scheme for Rigid Body Dynamics with Inelastic Collisions and Coulomb Friction](https://doi.org/10.1002/(SICI)1097-0207(19960815)39:15%3C2673::AID-NME972%3E3.0.CO;2-I) |
| [037 · visual-servo](037-visual-servo.md) | 1996 | 控制 | [A Tutorial on Visual Servo Control](https://doi.org/10.1109/70.538972) |
| [038 · dwa](038-dwa.md) | 1997 | 导航 | [The Dynamic Window Approach to Collision Avoidance](https://doi.org/10.1109/100.580977) |
| [039 · isard-condensation](039-isard-condensation.md) | 1998 | 估计 | [CONDENSATION—Conditional Density Propagation for Visual Tracking](https://doi.org/10.1023/A:1008078328650) |
| [040 · rrt](040-rrt.md) | 1998 | 规划 | [Rapidly-Exploring Random Trees: A New Tool for Path Planning](https://lavalle.pl/papers/Lav98c.pdf) |
| [041 · mcl](041-mcl.md) | 1999 | 估计 | [Monte Carlo Localization for Mobile Robots](https://doi.org/10.1109/ROBOT.1999.772544) |
| [042 · zhang-calibration](042-zhang-calibration.md) | 2000 | 视觉 | [A Flexible New Technique for Camera Calibration](https://doi.org/10.1109/34.888718) |
| [043 · rrt-connect](043-rrt-connect.md) | 2000 | 规划 | [RRT-Connect: An Efficient Approach to Single-Query Path Planning](https://doi.org/10.1109/ROBOT.2000.844730) |
| [044 · slam-convergence](044-slam-convergence.md) | 2001 | SLAM | [A Solution to the Simultaneous Localization and Map Building (SLAM) Problem](https://doi.org/10.1109/70.938381) |
| [045 · fastslam](045-fastslam.md) | 2002 | SLAM | [FastSLAM: A Factored Solution to the Simultaneous Localization and Mapping Problem](https://cdn.aaai.org/AAAI/2002/AAAI02-089.pdf) |
| [046 · dstar-lite](046-dstar-lite.md) | 2002 | 规划 | [D* Lite](https://cdn.aaai.org/AAAI/2002/AAAI02-072.pdf) |
| [047 · preview-zmp](047-preview-zmp.md) | 2003 | 腿足 | [Biped Walking Pattern Generation by Using Preview Control of Zero-Moment Point](https://doi.org/10.1109/ROBOT.2003.1241826) |
| [048 · sift](048-sift.md) | 2004 | 视觉 | [Distinctive Image Features from Scale-Invariant Keypoints](https://www.cs.ubc.ca/~lowe/papers/ijcv04.pdf) |
| [049 · five-point](049-five-point.md) | 2004 | 视觉 | [An Efficient Solution to the Five-Point Relative Pose Problem](https://doi.org/10.1109/TPAMI.2004.17) |
| [050 · task-priority](050-task-priority.md) | 2005 | 控制 | [Synthesis of Whole-Body Behaviors Through Hierarchical Control of Behavioral Primitives](https://ai.stanford.edu/~lsentis/files/ijhr-05.pdf) |
| [051 · id-iLQR](051-id-iLQR.md) | 2005 | 轨迹 | [A Generalized Iterative LQG Method for Locally-Optimal Feedback Control of Constrained Nonlinear Stochastic Systems](https://roboti.us/lab/papers/TodorovACC05.pdf) |
| [052 · anytime-dstar](052-anytime-dstar.md) | 2005 | 规划 | [Anytime Dynamic A*: An Anytime, Replanning Algorithm](https://cdn.aaai.org/ICAPS/2005/ICAPS05-027.pdf) |
| [053 · graphslam](053-graphslam.md) | 2006 | SLAM | [The GraphSLAM Algorithm with Applications to Large-Scale Mapping of Urban Structures](https://robots.stanford.edu/papers/thrun.graphslam.pdf) |
| [054 · capture-point](054-capture-point.md) | 2006 | 腿足 | [Capture Point: A Step toward Humanoid Push Recovery](https://doi.org/10.1109/ICHR.2006.321385) |
| [055 · gmap](055-gmap.md) | 2007 | SLAM | [Improved Techniques for Grid Mapping With Rao-Blackwellized Particle Filters](https://www.ipb.uni-bonn.de/wp-content/papercite-data/pdf/grisetti07tro.pdf) |
| [056 · ptam](056-ptam.md) | 2007 | SLAM | [Parallel Tracking and Mapping for Small AR Workspaces](https://www.robots.ox.ac.uk/~dwm/Publications/Papers/klein_murray_ismar2007/klein_murray_ismar2007.pdf) |
| [057 · isam](057-isam.md) | 2008 | SLAM | [iSAM: Incremental Smoothing and Mapping](https://www.cs.cmu.edu/~kaess/pub/Kaess08tro.pdf) |
| [058 · ros](058-ros.md) | 2009 | 系统 | [ROS: An Open-Source Robot Operating System](https://ai.stanford.edu/~mquigley/papers/icra2009-ros.pdf) |
| [059 · chomp](059-chomp.md) | 2009 | 轨迹 | [CHOMP: Gradient Optimization Techniques for Efficient Motion Planning](https://personalrobotics.cs.washington.edu/publications/ratliff2009chomp.pdf) |
| [060 · orb](060-orb.md) | 2011 | 视觉 | [ORB: An Efficient Alternative to SIFT or SURF](https://doi.org/10.1109/ICCV.2011.6126544) |
| [061 · stomp](061-stomp.md) | 2011 | 轨迹 | [STOMP: Stochastic Trajectory Optimization for Motion Planning](https://doi.org/10.1109/ICRA.2011.5980280) |
| [062 · rrtstar](062-rrtstar.md) | 2011 | 规划 | [Sampling-Based Algorithms for Optimal Motion Planning](https://arxiv.org/abs/1105.1186) |
| [063 · g2o](063-g2o.md) | 2011 | SLAM | [g2o: A General Framework for Graph Optimization](https://doi.org/10.1109/ICRA.2011.5979949) |
| [064 · kinfu](064-kinfu.md) | 2011 | SLAM | [KinectFusion: Real-Time Dense Surface Mapping and Tracking](https://doi.org/10.1109/ISMAR.2011.6092378) |
| [065 · min-snap](065-min-snap.md) | 2011 | 轨迹 | [Minimum Snap Trajectory Generation and Control for Quadrotors](https://doi.org/10.1109/ICRA.2011.5980409) |
| [066 · dbow](066-dbow.md) | 2012 | 视觉 | [Bags of Binary Words for Fast Place Recognition in Image Sequences](https://doi.org/10.1109/TRO.2012.2197158) |
| [067 · ompl](067-ompl.md) | 2012 | 系统 | [The Open Motion Planning Library](https://doi.org/10.1109/MRA.2012.2205651) |
| [068 · isam2](068-isam2.md) | 2012 | SLAM | [iSAM2: Incremental Smoothing and Mapping Using the Bayes Tree](https://doi.org/10.1177/0278364911430419) |
| [069 · tum-rgbd](069-tum-rgbd.md) | 2012 | 基准 | [A Benchmark for the Evaluation of RGB-D SLAM Systems](https://doi.org/10.1109/IROS.2012.6385773) |
| [070 · kitti](070-kitti.md) | 2012 | 基准 | [Are We Ready for Autonomous Driving? The KITTI Vision Benchmark Suite](https://www.cvlibs.net/publications/Geiger2012CVPR.pdf) |
| [071 · mujoco](071-mujoco.md) | 2012 | 系统 | [MuJoCo: A Physics Engine for Model-Based Control](https://homes.cs.washington.edu/~todorov/papers/TodorovIROS12.pdf) |
| [072 · contact-implicit](072-contact-implicit.md) | 2012 | 接触 | [Contact-Invariant Optimization for Hand Manipulation](https://homes.cs.washington.edu/~todorov/papers/MordatchSCA12.pdf) |
| [073 · trajopt](073-trajopt.md) | 2013 | 轨迹 | [Finding Locally Optimal, Collision-Free Trajectories with Sequential Convex Optimization](https://doi.org/10.15607/RSS.2013.IX.031) |
| [074 · octomap](074-octomap.md) | 2013 | SLAM | [OctoMap: An Efficient Probabilistic 3D Mapping Framework Based on Octrees](https://doi.org/10.1007/s10514-012-9321-0) |
| [075 · contact-trajopt](075-contact-trajopt.md) | 2014 | 接触 | [A Direct Method for Trajectory Optimization of Rigid Bodies Through Contact](https://doi.org/10.1177/0278364913506757) |
| [076 · lsdslam](076-lsdslam.md) | 2014 | SLAM | [LSD-SLAM: Large-Scale Direct Monocular SLAM](https://vision.in.tum.de/_media/spezial/bib/engel14eccv.pdf) |
| [077 · loam](077-loam.md) | 2014 | SLAM | [LOAM: Lidar Odometry and Mapping in Real-Time](https://doi.org/10.15607/RSS.2014.X.007) |
| [078 · svo](078-svo.md) | 2014 | SLAM | [SVO: Fast Semi-Direct Monocular Visual Odometry](https://doi.org/10.1109/ICRA.2014.6906584) |
| [079 · informed-rrtstar](079-informed-rrtstar.md) | 2014 | 规划 | [Informed RRT*: Optimal Sampling-Based Path Planning Focused via Direct Sampling of an Admissible Ellipsoidal Heuristic](https://arxiv.org/abs/1404.2334) |
| [080 · wholebody-qp](080-wholebody-qp.md) | 2014 | 控制 | [Whole-Body Motion Planning with Centroidal Dynamics and Full Kinematics](https://doi.org/10.1109/HUMANOIDS.2014.7041398) |
| [081 · bitstar](081-bitstar.md) | 2014 | 规划 | [Batch Informed Trees (BIT*): Sampling-Based Optimal Planning via the Heuristically Guided Search of Implicit Random Geometric Graphs](https://arxiv.org/abs/1405.5848) |
| [082 · orbslam](082-orbslam.md) | 2015 | SLAM | [ORB-SLAM: A Versatile and Accurate Monocular SLAM System](https://arxiv.org/abs/1502.00956) |
| [083 · imu-preintegration](083-imu-preintegration.md) | 2015 | 估计 | [IMU Preintegration on Manifold for Efficient Visual-Inertial Maximum-a-Posteriori Estimation](https://doi.org/10.15607/RSS.2015.XI.006) |
| [084 · elasticfusion](084-elasticfusion.md) | 2015 | SLAM | [ElasticFusion: Dense SLAM Without a Pose Graph](https://doi.org/10.15607/RSS.2015.XI.001) |
| [085 · dso](085-dso.md) | 2016 | SLAM | [Direct Sparse Odometry](https://arxiv.org/abs/1607.02565) |
| [086 · euRoC](086-euRoC.md) | 2016 | 基准 | [The EuRoC Micro Aerial Vehicle Datasets](https://doi.org/10.1177/0278364915620033) |
| [087 · gpmp2](087-gpmp2.md) | 2016 | 轨迹 | [Motion Planning as Probabilistic Inference Using Gaussian Processes and Factor Graphs](https://doi.org/10.15607/RSS.2016.XII.001) |
| [088 · colmap](088-colmap.md) | 2016 | 视觉 | [Structure-from-Motion Revisited](https://demuc.de/papers/schoenberger2016sfm.pdf) |
| [089 · orbslam2](089-orbslam2.md) | 2016 | SLAM | [ORB-SLAM2: An Open-Source SLAM System for Monocular, Stereo, and RGB-D Cameras](https://arxiv.org/abs/1610.06475) |
| [090 · se-sync](090-se-sync.md) | 2016 | 估计 | [SE-Sync: A Certifiably Correct Algorithm for Synchronization over the Special Euclidean Group](https://arxiv.org/abs/1612.07386) |
| [091 · cbfqp](091-cbfqp.md) | 2016 | 控制 | [Control Barrier Function Based Quadratic Programs for Safety Critical Systems](https://arxiv.org/abs/1609.06408) |
| [092 · vinsmono](092-vinsmono.md) | 2017 | SLAM | [VINS-Mono: A Robust and Versatile Monocular Visual-Inertial State Estimator](https://arxiv.org/abs/1708.03852) |
| [093 · toppra](093-toppra.md) | 2017 | 轨迹 | [A New Approach to Time-Optimal Path Parameterization Based on Reachability Analysis](https://arxiv.org/abs/1707.07239) |
| [094 · cheetah-mpc](094-cheetah-mpc.md) | 2018 | 腿足 | [Dynamic Locomotion in the MIT Cheetah 3 Through Convex Model-Predictive Control](https://doi.org/10.1109/IROS.2018.8594448) |
| [095 · legoloam](095-legoloam.md) | 2018 | SLAM | [LeGO-LOAM: Lightweight and Ground-Optimized Lidar Odometry and Mapping on Variable Terrain](https://doi.org/10.1109/IROS.2018.8594299) |
| [096 · teaser](096-teaser.md) | 2020 | 视觉 | [TEASER: Fast and Certifiable Point Cloud Registration](https://arxiv.org/abs/2001.07715) |
| [097 · liosam](097-liosam.md) | 2020 | SLAM | [LIO-SAM: Tightly-Coupled Lidar Inertial Odometry via Smoothing and Mapping](https://arxiv.org/abs/2007.00258) |
| [098 · orbslam3](098-orbslam3.md) | 2020 | SLAM | [ORB-SLAM3: An Accurate Open-Source Library for Visual, Visual-Inertial, and Multimap SLAM](https://arxiv.org/abs/2007.11898) |
| [099 · fastlio2](099-fastlio2.md) | 2021 | SLAM | [FAST-LIO2: Fast Direct LiDAR-Inertial Odometry](https://arxiv.org/abs/2107.06829) |
| [100 · kissicp](100-kissicp.md) | 2022 | SLAM | [KISS-ICP: In Defense of Point-to-Point ICP—Simple, Accurate, and Robust Registration If Done the Right Way](https://arxiv.org/abs/2209.15397) |
