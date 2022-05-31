root=$1

if [[ -z $root ]]; then
  echo "Missing directory parameter"
  exit 1
fi

for dir in $root/*; do
  if [[ ! -e $dir/Makefile ]]; then
    continue
  fi

  make -C $dir build
  make -C $dir push
done
